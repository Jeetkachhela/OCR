from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.core.dependencies import get_current_user
from app.models import User, Document
from app.schemas import SearchRequest, SearchResponse, SearchMatchResponse
from app.services.vector_service import VectorService

router = APIRouter(prefix="/search", tags=["Semantic Search & Retrieval Engine"])

@router.post("", response_model=SearchResponse)
def perform_semantic_search(
    query_in: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes hybrid semantic search on ingested document text.
    Retrieves matching files and extracts highlight text snippets with similarity confidence scores.
    """
    if not query_in.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")

    # Execute search inside Vector database
    raw_matches = VectorService.search(query_in.query, limit=query_in.limit)

    formatted_matches = []
    for match in raw_matches:
        formatted_matches.append(
            SearchMatchResponse(
                document_id=match["document_id"],
                filename=match["filename"],
                mime_type=match["mime_type"],
                similarity_score=match["similarity_score"],
                matched_text_snippet=match["matched_text_snippet"],
                status=match["status"],
                created_at=db.query(Document.created_at).filter(Document.id == match["document_id"]).scalar()
            )
        )

    return SearchResponse(
        query=query_in.query,
        matches=formatted_matches
    )
