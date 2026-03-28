from __future__ import annotations

from .registry import OntologyRegistry
from .schemas import OntologyMount


class OntologyMountNotFoundError(RuntimeError):
    pass


class InvalidOntologyMountError(RuntimeError):
    pass


class OntologyMountResolver:
    def __init__(self, registry: OntologyRegistry):
        self.registry = registry

    def resolve(
        self,
        ontology_id: str,
        version: str | None = None,
        *,
        allow_invalid: bool = False,
        require_runtime: bool = True,
    ) -> OntologyMount:
        mount = self.registry.get_mount(ontology_id, version)
        if mount is None:
            raise OntologyMountNotFoundError(f"Ontology mount not found: {ontology_id}@{version or 'latest'}")

        if allow_invalid:
            return mount

        if not mount.validation.structural_valid:
            raise InvalidOntologyMountError(_invalid_message(mount, "structural"))
        if not mount.validation.semantic_valid:
            raise InvalidOntologyMountError(_invalid_message(mount, "semantic"))
        if require_runtime and not mount.validation.runtime_valid:
            raise InvalidOntologyMountError(_invalid_message(mount, "runtime"))
        return mount

    def resolve_compat(
        self,
        value: str = "restaurant",
        version: str | None = None,
        *,
        allow_invalid: bool = False,
        require_runtime: bool = True,
    ) -> OntologyMount:
        ontology_id, resolved_version = self.registry.resolve_compat_identity(value, version)
        return self.resolve(
            ontology_id=ontology_id,
            version=resolved_version,
            allow_invalid=allow_invalid,
            require_runtime=require_runtime,
        )


def _invalid_message(mount: OntologyMount, stage: str) -> str:
    details = "; ".join(mount.validation.errors) if mount.validation.errors else "validation failed"
    return f"Ontology mount {mount.ontology_id}@{mount.version} is not {stage}-valid: {details}"
