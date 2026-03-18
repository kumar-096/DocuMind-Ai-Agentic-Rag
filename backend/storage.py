import os
import uuid
from abc import ABC, abstractmethod
from typing import BinaryIO

from settings import get_settings


class DocumentStorage(ABC):

    @abstractmethod
    def save(self, file_obj: BinaryIO, filename: str, user_id: int) -> str:
        """Persist file and return stored path."""


class LocalFileStorage(DocumentStorage):

    def __init__(self) -> None:
        self.base_dir = os.path.join("documents")
        os.makedirs(self.base_dir, exist_ok=True)

    def save(self, file_obj: BinaryIO, filename: str, user_id: int) -> str:

        # create user-specific directory
        user_dir = os.path.join(self.base_dir, f"user_{user_id}")
        os.makedirs(user_dir, exist_ok=True)

        # prevent path traversal
        safe_name = os.path.basename(filename)

        # prevent overwriting files
        unique_name = f"{uuid.uuid4().hex}_{safe_name}"

        path = os.path.join(user_dir, unique_name)

        with open(path, "wb") as out:
            out.write(file_obj.read())

        return path


def get_document_storage() -> DocumentStorage:

    settings = get_settings()

    if settings.storage_backend == "local":
        return LocalFileStorage()

    raise ValueError(f"Unsupported storage backend: {settings.storage_backend}")