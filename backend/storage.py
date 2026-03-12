import os
from abc import ABC, abstractmethod
from typing import BinaryIO

from settings import get_settings


class DocumentStorage(ABC):
    @abstractmethod
    def save(self, file_obj: BinaryIO, filename: str) -> str:
        """Persist file and return its stored path."""


class LocalFileStorage(DocumentStorage):
    def __init__(self) -> None:
        self.base_dir = os.path.join("documents")
        os.makedirs(self.base_dir, exist_ok=True)

    def save(self, file_obj: BinaryIO, filename: str) -> str:
        safe_name = os.path.basename(filename)
        path = os.path.join(self.base_dir, safe_name)
        with open(path, "wb") as out:
            out.write(file_obj.read())
        return path


def get_document_storage() -> DocumentStorage:
    settings = get_settings()
    if settings.storage_backend == "local":
        return LocalFileStorage()
    raise ValueError(f"Unsupported storage backend: {settings.storage_backend}")

