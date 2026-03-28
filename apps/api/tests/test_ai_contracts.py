from app.core.ai_contracts import get_ai_contract_registry
from app.schemas.ai import AIFunction


def test_ai_contract_registry_covers_every_function():
    registry = get_ai_contract_registry()
    assert set(registry) == set(AIFunction)


def test_mutating_ai_functions_require_confirmation_and_structured_output():
    registry = get_ai_contract_registry()

    for contract in registry.values():
        assert contract.must_be_audited is True
        if contract.allows_state_mutation:
            assert contract.requires_user_confirmation is True
            assert contract.requires_structured_output is True
            assert contract.must_carry_evidence is True
