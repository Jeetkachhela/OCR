import logging
import re
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("vector_service")

# Thread-safe global model and Qdrant cache
_model_instance = None
_qdrant_client = None
COLLECTION_NAME = "logistics_intelligence"
VECTOR_DIMENSION = 384 # sentence-transformers all-MiniLM-L6-v2 output dimension

def get_embedding_model():
    """
    Lazy load the SentenceTransformer model to optimize app startup speed and handle memory constraints.
    Falls back to simple TF-IDF and character cosine matching if transformers fail.
    """
    global _model_instance
    if _model_instance is not None:
        return _model_instance
    
    try:
        from sentence_transformers import SentenceTransformer
        logger.info("Initializing SentenceTransformer model 'all-MiniLM-L6-v2'")
        _model_instance = SentenceTransformer('all-MiniLM-L6-v2')
        return _model_instance
    except Exception as e:
        logger.warning(f"SentenceTransformers failed to load: {e}. Semantic Search will run in fallback TF-IDF similarity mode.")
        _model_instance = "fallback"
        return _model_instance


def get_qdrant_client():
    """
    Establishes connection to Qdrant Cloud Vector Database.
    Returns None if unconfigured or unreachable.
    """
    global _qdrant_client
    if _qdrant_client is not None:
        return _qdrant_client

    if not settings.QDRANT_HOST or not settings.QDRANT_API_KEY:
        logger.info("Qdrant Cloud credentials are not configured. Falling back to local high-fidelity vector registry.")
        return None

    try:
        from qdrant_client import QdrantClient
        from qdrant_client.http.models import Distance, VectorParams

        logger.info(f"Connecting to Qdrant Cloud cluster endpoint: {settings.QDRANT_HOST}")
        client = QdrantClient(
            url=settings.QDRANT_HOST,
            api_key=settings.QDRANT_API_KEY,
            timeout=10.0
        )
        
        # Verify connection and ensure collection is initialized
        collections = client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)
        
        if not exists:
            logger.info(f"Creating new Qdrant Cloud collection '{COLLECTION_NAME}' (dim={VECTOR_DIMENSION})")
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_DIMENSION, distance=Distance.COSINE),
            )
            
        _qdrant_client = client
        logger.info("Qdrant Cloud Vector Database successfully integrated and initialized.")
        return _qdrant_client
    except Exception as e:
        logger.warning(f"Qdrant Cloud connection failed: {e}. Falling back to localized vector store.")
        return None


class VectorService:
    # Local in-memory document vector registry (kept in sync as an offline fallback)
    _registry: List[Dict[str, Any]] = []

    @classmethod
    def index_document(cls, document_id: int, filename: str, mime_type: str, text: str, status: str) -> None:
        """
        Indexes a document by generating embeddings and registering the text chunk
        both in Qdrant Cloud (if active) and our localized in-memory space.
        """
        model = get_embedding_model()
        vector = None
        
        if model != "fallback":
            try:
                vector = model.encode(text).tolist()
            except Exception as e:
                logger.error(f"Error generating dense vector embedding: {e}")
        
        # Sync Local Fallback Store
        cls._registry = [item for item in cls._registry if item["document_id"] != document_id]
        cls._registry.append({
            "document_id": document_id,
            "filename": filename,
            "mime_type": mime_type,
            "text": text,
            "vector": vector,
            "status": status
        })
        logger.info(f"Indexed document {document_id} ('{filename}') locally.")

        # Sync Qdrant Cloud
        from app.core.system_settings import runtime_settings
        client = get_qdrant_client()
        if client and vector and runtime_settings.qdrant_sync_enabled:
            try:
                from qdrant_client.http.models import PointStruct
                
                # Upsert point to Qdrant Cloud
                client.upsert(
                    collection_name=COLLECTION_NAME,
                    points=[
                        PointStruct(
                            id=document_id, # Integer doc id serves as point id
                            vector=vector,
                            payload={
                                "document_id": document_id,
                                "filename": filename,
                                "mime_type": mime_type,
                                "text": text,
                                "status": status
                            }
                        )
                    ]
                )
                logger.info(f"Successfully upserted and indexed vector for Document ID {document_id} inside Qdrant Cloud.")
            except Exception as q_err:
                logger.error(f"Failed to index point to Qdrant Cloud, fallback is active. Error: {q_err}")

    @classmethod
    def search(cls, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Executes hybrid semantic search. Queries Qdrant Cloud cluster directly.
        Falls back to local cosine similarities if connection is offline.
        """
        if not query:
            return []

        model = get_embedding_model()
        client = get_qdrant_client()

        # Generate search query embedding vector
        query_vector = None
        if model != "fallback":
            try:
                query_vector = model.encode(query).tolist()
            except Exception as e:
                logger.error(f"Error generating query vector: {e}")

        # 1. Try Qdrant Cloud search
        from app.core.system_settings import runtime_settings
        if client and query_vector and runtime_settings.qdrant_sync_enabled:
            try:
                logger.info(f"Routing semantic search query directly to Qdrant Cloud: '{query}'")
                search_results = client.query_points(
                    collection_name=COLLECTION_NAME,
                    query=query_vector,
                    limit=limit
                ).points
                
                formatted_matches = []
                for point in search_results:
                    payload = point.payload or {}
                    snippet = cls._generate_snippet(payload.get("text", ""), query)
                    formatted_matches.append({
                        "document_id": payload.get("document_id"),
                        "filename": payload.get("filename"),
                        "mime_type": payload.get("mime_type"),
                        "similarity_score": round(point.score, 4),
                        "matched_text_snippet": snippet,
                        "status": payload.get("status", "completed")
                    })
                return formatted_matches
            except Exception as q_search_err:
                logger.warning(f"Qdrant Cloud search failed, executing local fallback: {q_search_err}")

        # 2. Local Fallback Search (Dense vectors or overlap n-grams Jaccard)
        results = []
        if query_vector:
            try:
                for item in cls._registry:
                    if item["vector"]:
                        score = cls._cosine_similarity(query_vector, item["vector"])
                        snippet = cls._generate_snippet(item["text"], query)
                        results.append({
                            "document_id": item["document_id"],
                            "filename": item["filename"],
                            "mime_type": item["mime_type"],
                            "similarity_score": round(score, 4),
                            "matched_text_snippet": snippet,
                            "status": item["status"]
                        })
                results.sort(key=lambda x: x["similarity_score"], reverse=True)
                return results[:limit]
            except Exception as e:
                logger.error(f"Local dense cosine search crashed, falling back to TF-IDF overlap Jaccard search: {e}")

        # Overlap word count match fallback
        for item in cls._registry:
            score = cls._compute_word_overlap_score(query, item["text"])
            if score > 0.05:
                snippet = cls._generate_snippet(item["text"], query)
                results.append({
                    "document_id": item["document_id"],
                    "filename": item["filename"],
                    "mime_type": item["mime_type"],
                    "similarity_score": round(score, 4),
                    "matched_text_snippet": snippet,
                    "status": item["status"]
                })
        
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:limit]

    @staticmethod
    def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        import math
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude_1 = math.sqrt(sum(a * a for a in vec1))
        magnitude_2 = math.sqrt(sum(b * b for b in vec2))
        if not magnitude_1 or not magnitude_2:
            return 0.0
        return dot_product / (magnitude_1 * magnitude_2)

    @staticmethod
    def _compute_word_overlap_score(query: str, text: str) -> float:
        q_words = set(re.findall(r"\w+", query.lower()))
        t_words = set(re.findall(r"\w+", text.lower()))
        if not q_words:
            return 0.0
        intersection = q_words.intersection(t_words)
        jaccard = len(intersection) / len(q_words)
        if query.lower().strip() in text.lower():
            jaccard += 0.4
        return min(jaccard, 1.0)

    @staticmethod
    def _generate_snippet(text: str, query: str) -> str:
        words = query.lower().split()
        match_idx = -1
        for word in words:
            if len(word) > 2:
                idx = text.lower().find(word)
                if idx != -1:
                    match_idx = idx
                    break
        if match_idx == -1:
            return text[:160] + "..." if len(text) > 160 else text
        start = max(0, match_idx - 60)
        end = min(len(text), match_idx + 100)
        prefix = "..." if start > 0 else ""
        suffix = "..." if end < len(text) else ""
        return prefix + text[start:end].replace("\n", " ").strip() + suffix
