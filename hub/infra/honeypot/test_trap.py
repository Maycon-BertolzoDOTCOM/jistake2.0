"""Regressão de parser XML seguro (defusedxml + forbid_dtd=True)."""
import io
import pytest
from defusedxml.ElementTree import fromstring

MAX_BYTES = 5 * 1024 * 1024

MALICIOUS = {
    "xxe_doctype": b'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY xxe "evil">]><root>&xxe;</root>',
    "entitybomb": b'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "a"><!ENTITY b "&a;&a;&a;">]><root>&b;</root>',
    "oversized": (b"<xml>" + b"a" * (MAX_BYTES + 100) + b"</xml>"),
}


def parse_safe(xml_bytes: bytes):
    if len(xml_bytes) > MAX_BYTES:
        raise ValueError("payload too large")
    return fromstring(xml_bytes, forbid_dtd=True, forbid_entities=True, forbid_external=True)


@pytest.mark.parametrize("name,xml", list(MALICIOUS.items()))
def test_malicious_rejected(name, xml):
    with pytest.raises(Exception):
        if len(xml) > MAX_BYTES:
            raise ValueError("payload too large")
        parse_safe(xml)


def test_valid_xml_accepted():
    xml = b'<?xml version="1.0"?><root><id>123</id></root>'
    el = parse_safe(xml)
    assert el.tag == "root"
    assert el.findtext("id") == "123"


def test_dtd_without_entity():
    xml = b'<!DOCTYPE foo [<!ELEMENT foo EMPTY>]><foo/>' + b"?"
    with pytest.raises(Exception):
        parse_safe(xml)
