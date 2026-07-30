from app.tenants.router import _sanitize_sector, CreateOrgRequest, VALID_SECTORS
from app.middleware.tenant import _is_excluded, _extract_bearer_token

def test_sanitize_sector_valid():
    """Test _sanitize_sector returns valid sectors unaltered."""
    assert _sanitize_sector("technology") == "technology"
    assert _sanitize_sector("finance") == "finance"
    assert _sanitize_sector("other") == "other"

def test_sanitize_sector_invalid():
    """Test _sanitize_sector returns None for unrecognized sectors."""
    assert _sanitize_sector("invalid_sector_123") is None
    assert _sanitize_sector("") is None
    assert _sanitize_sector(None) is None

def test_create_org_request_validation():
    """Test CreateOrgRequest validation rules."""
    req = CreateOrgRequest(name="Agência Alpha", sector="technology")
    assert req.name == "Agência Alpha"
    assert req.sector == "technology"
    assert req.timezone == "Europe/Lisbon"

def test_tenant_middleware_excluded_paths():
    """Test _is_excluded recognizes paths bypassing tenant resolution."""
    assert _is_excluded("/health") is True
    assert _is_excluded("/api/docs") is True
    assert _is_excluded("/auth/login") is True
    assert _is_excluded("/api/marketing/campaigns") is False
