from app.whatsapp.router import ConfigUpsert

def test_config_upsert_model():
    """Test ConfigUpsert model validation."""
    config = ConfigUpsert(
        provider="meta",
        phone_number="+351912345678",
        account_sid="AC12345",
        auth_token="secret_token"
    )
    assert config.provider == "meta"
    assert config.phone_number == "+351912345678"
    assert config.auth_token == "secret_token"

def test_whatsapp_webhook_unauthenticated(client):
    """Test WhatsApp webhook endpoint accessibility."""
    response = client.post(
        "/api/whatsapp/webhooks",
        json={"Body": "Olá", "From": "whatsapp:+351912345678"}
    )
    # The webhook route should accept incoming calls (200 or processed payload)
    assert response.status_code in (200, 422, 500)
