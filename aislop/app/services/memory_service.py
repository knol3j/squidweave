import uuid
from typing import Any

from app.config import settings


async def store_memory(
    category: str,
    title: str,
    content: str,
    source: str | None = None,
    tags: list[str] | None = None,
) -> dict[str, Any]:
    try:
        import chromadb
        client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        collection = client.get_or_create_collection("memories")
        doc_id = f"{category}-{title}"
        collection.add(
            documents=[content],
            metadatas=[{"category": category, "title": title, "source": source or "", "tags": ",".join(tags or [])}],
            ids=[doc_id],
        )
        return {"id": doc_id, "category": category, "title": title, "content": content}
    except Exception:
        return {"id": "local", "category": category, "title": title, "content": content}


async def search_memory(query: str, k: int = 5) -> list[dict[str, Any]]:
    try:
        import chromadb
        client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        collection = client.get_or_create_collection("memories")
        results = collection.query(query_texts=[query], n_results=k)
        output = []
        if results["ids"]:
            for i, doc_id in enumerate(results["ids"][0]):
                meta = results["metadatas"][0][i] if results["metadatas"] else {}
                output.append({
                    "id": doc_id,
                    "content": results["documents"][0][i] if results["documents"] else "",
                    "category": meta.get("category", ""),
                    "title": meta.get("title", ""),
                    "source": meta.get("source", ""),
                    "tags": meta.get("tags", "").split(",") if meta.get("tags") else [],
                })
        return output
    except Exception:
        return []


async def list_memories(k: int = 20) -> list[dict[str, Any]]:
    try:
        import chromadb
        client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        collection = client.get_or_create_collection("memories")
        results = collection.get(limit=k)
        output = []
        if results["ids"]:
            for i, doc_id in enumerate(results["ids"]):
                meta = results["metadatas"][i] if results["metadatas"] else {}
                output.append({
                    "id": doc_id,
                    "content": results["documents"][i] if results["documents"] else "",
                    "category": meta.get("category", ""),
                    "title": meta.get("title", ""),
                    "source": meta.get("source", ""),
                    "tags": meta.get("tags", "").split(",") if meta.get("tags") else [],
                })
        return output
    except Exception:
        return []


async def hermes_upsert(campaign_id: str, entries: list[dict[str, Any]]) -> dict[str, Any]:
    try:
        import chromadb
        client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        collection = client.get_or_create_collection("hermes_memories")
        ids = []
        documents = []
        metadatas = []
        for entry in entries:
            entry_id = f"{campaign_id}-{uuid.uuid4().hex[:12]}"
            ids.append(entry_id)
            documents.append(entry.get("text", ""))
            meta = dict(entry.get("metadata", {}))
            meta["campaignId"] = campaign_id
            meta["scope"] = entry.get("scope", "") or ""
            meta["category"] = entry.get("category", "") or ""
            meta["text"] = entry.get("text", "") or ""
            meta = {k: v for k, v in meta.items() if v is not None and v != []}
            metadatas.append(meta)
        if ids:
            collection.add(documents=documents, metadatas=metadatas, ids=ids)
        return {"synced": True, "entries": len(ids)}
    except Exception as e:
        return {"synced": False, "entries": 0, "error": str(e)}


async def hermes_recall(campaign_id: str, query: str = "", target_id: str | None = None, limit: int = 8) -> list[dict[str, Any]]:
    try:
        import chromadb
        client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        collection = client.get_or_create_collection("hermes_memories")
        if query:
            results = collection.query(query_texts=[query], n_results=limit * 3)
        else:
            results = collection.get(limit=limit * 3)
        output = []
        raw_ids = results.get("ids", [])
        raw_docs = results.get("documents", []) or []
        raw_metas = results.get("metadatas", []) or []
        if raw_ids and isinstance(raw_ids[0], list):
            ids_flat = raw_ids[0]
            docs_flat = raw_docs[0] if raw_docs and isinstance(raw_docs[0], list) else raw_docs
            metas_flat = raw_metas[0] if raw_metas and isinstance(raw_metas[0], list) else raw_metas
        else:
            ids_flat = raw_ids
            docs_flat = raw_docs
            metas_flat = raw_metas
        for i, entry_id in enumerate(ids_flat):
            meta = metas_flat[i] if i < len(metas_flat) and isinstance(metas_flat[i], dict) else {}
            if meta.get("campaignId") != campaign_id:
                continue
            if target_id and meta.get("targetId") and meta["targetId"] != target_id:
                continue
            doc = docs_flat[i] if i < len(docs_flat) else ""
            output.append({
                "id": entry_id,
                "scope": meta.get("scope", ""),
                "category": meta.get("category", ""),
                "text": meta.get("text", doc),
                "metadata": {k: v for k, v in meta.items() if k not in ("scope", "category", "text", "campaignId")},
                "campaignId": meta.get("campaignId", campaign_id),
                "recordedAt": meta.get("recordedAt", ""),
            })
            if len(output) >= limit:
                break
        return output
    except Exception:
        return []
