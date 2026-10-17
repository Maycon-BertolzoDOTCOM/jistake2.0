# HUB Multi-Vertical — NSG Terraform Configuration
# Três NSGs: Web (443 público), App (8080 só do Web), Trap (5001 só do Web)
# Oracle Cloud Infrastructure (OCI)

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

variable "tenancy_ocid" {
  type        = string
  description = "OCID do tenancy"
}

variable "user_ocid" {
  type        = string
  description = "OCID do usuário"
}

variable "fingerprint" {
  type        = string
  description = "Fingerprint da chave API"
}

variable "private_key_path" {
  type        = string
  description = "Caminho para chave privada PEM"
}

variable "region" {
  type        = string
  description = "Região OCI (ex: sa-saopaulo-1)"
  default     = "sa-saopaulo-1"
}

variable "compartment_ocid" {
  type        = string
  description = "OCID do compartment"
}

variable "vcn_ocid" {
  type        = string
  description = "OCID da VCN"
}

variable "admin_cidr" {
  type        = string
  description = "CIDR do IP admin para SSH"
  default     = "203.0.113.0/24"
}

# ============================================================
# NSG 1: Web — Frontend público (Nginx)
# ============================================================
resource "oci_core_network_security_group" "web_nsg" {
  compartment_id = var.compartment_ocid
  vcn_id         = var.vcn_ocid
  display_name   = "hub-web-nsg"
  description    = "NSG para frontend público (Nginx na porta 443)"

  # Ingress rules
  ingress_security_rules = [
    # HTTPS público (API Gateway termina TLS, mas health checks vêm da internet)
    {
      protocol    = "6"  # TCP
      source      = "0.0.0.0/0"
      source_type = "CIDR_BLOCK"
      stateless   = false
      description = "HTTPS público"
      tcp_options = {
        destination_port_range = {
          min = 443
          max = 443
        }
      }
    },
    # HTTP redirect (opcional)
    {
      protocol    = "6"
      source      = "0.0.0.0/0"
      source_type = "CIDR_BLOCK"
      stateless   = false
      description = "HTTP redirect"
      tcp_options = {
        destination_port_range = {
          min = 80
          max = 80
        }
      }
    },
    # Health check do Load Balancer / API Gateway
    {
      protocol    = "6"
      source      = "10.0.0.0/16"  # VCN CIDR
      source_type = "CIDR_BLOCK"
      stateless   = false
      description = "Health check interno"
      tcp_options = {
        destination_port_range = {
          min = 443
          max = 443
        }
      }
    },
    # SSH admin (restrito)
    {
      protocol    = "6"
      source      = var.admin_cidr
      source_type = "CIDR_BLOCK"
      stateless   = false
      description = "SSH admin"
      tcp_options = {
        destination_port_range = {
          min = 22
          max = 22
        }
      }
    },
    # ICMP para monitoramento
    {
      protocol    = "1"
      source      = "10.0.0.0/16"
      source_type = "CIDR_BLOCK"
      stateless   = false
      description = "ICMP interno"
    },
  ]

  # Egress rules
  egress_security_rules = [
    # DNS
    {
      protocol    = "17"  # UDP
      destination = "0.0.0.0/0"
      destination_type = "CIDR_BLOCK"
      stateless   = false
      description = "DNS outbound"
      udp_options = {
        destination_port_range = {
          min = 53
          max = 53
        }
      }
    },
    # NTP
    {
      protocol    = "17"
      destination = "0.0.0.0/0"
      destination_type = "CIDR_BLOCK"
      stateless   = false
      description = "NTP outbound"
      udp_options = {
        destination_port_range = {
          min = 123
          max = 123
        }
      }
    },
    # APT/Updates (HTTP)
    {
      protocol    = "6"
      destination = "0.0.0.0/0"
      destination_type = "CIDR_BLOCK"
      stateless   = false
      description = "APT updates"
      tcp_options = {
        destination_port_range = {
          min = 80
          max = 80
        }
      }
    },
    # APT/Updates (HTTPS)
    {
      protocol    = "6"
      destination = "0.0.0.0/0"
      destination_type = "CIDR_BLOCK"
      stateless   = false
      description = "APT updates HTTPS"
      tcp_options = {
        destination_port_range = {
          min = 443
          max = 443
        }
      }
    },
    # Backend App (8080)
    {
      protocol    = "6"
      destination = "10.0.0.0/16"
      destination_type = "CIDR_BLOCK"
      stateless   = false
      description = "Backend app"
      tcp_options = {
        destination_port_range = {
          min = 8080
          max = 8080
        }
      }
    },
    # Honeypot (5001)
    {
      protocol    = "6"
      destination = "10.0.0.0/16"
      destination_type = "CIDR_BLOCK"
      stateless   = false
      description = "Honeypot"
      tcp_options = {
        destination_port_range = {
          min = 5001
          max = 5001
        }
      }
    },
  ]
}

# ============================================================
# NSG 2: App — Backend interno (apenas Web NSG acessa)
# ============================================================
resource "oci_core_network_security_group" "app_nsg" {
  compartment_id = var.compartment_ocid
  vcn_id         = var.vcn_ocid
  display_name   = "hub-app-nsg"
  description    = "NSG para backend (porta 8080) — apenas Web NSG"

  ingress_security_rules = [
    # Backend port apenas do Web NSG
    {
      protocol    = "6"
      source      = oci_core_network_security_group.web_nsg.id
      source_type = "NETWORK_SECURITY_GROUP"
      stateless   = false
      description = "Backend do Web NSG"
      tcp_options = {
        destination_port_range = {
          min = 8080
          max = 8080
        }
      }
    },
    # Health check interno
    {
      protocol    = "6"
      source      = "10.0.0.0/16"
      source_type = "CIDR_BLOCK"
      stateless   = false
      description = "Health check"
      tcp_options = {
        destination_port_range = {
          min = 8080
          max = 8080
        }
      }
    },
    # Métricas Prometheus
    {
      protocol    = "6"
      source      = "10.0.0.0/16"
      source_type = "CIDR_BLOCK"
      stateless   = false
      description = "Prometheus metrics"
      tcp_options = {
        destination_port_range = {
          min = 9090
          max = 9090
        }
      }
    },
  ]

  egress_security_rules = [
    # Apenas localhost e VCN interna
    {
      protocol    = "6"
      destination = "127.0.0.1/32"
      destination_type = "CIDR_BLOCK"
      stateless   = false
      description = "Localhost"
      tcp_options = {
        destination_port_range = {
          min = 1
          max = 65535
        }
      }
    },
    {
      protocol    = "6"
      destination = "10.0.0.0/16"
      destination_type = "CIDR_BLOCK"
      stateless   = false
      description = "VCN interna"
      tcp_options = {
        destination_port_range = {
          min = 1
          max = 65535
        }
      }
    },
  ]
}

# ============================================================
# NSG 3: Trap — Honeypot (apenas Web NSG acessa via proxy)
# ============================================================
resource "oci_core_network_security_group" "trap_nsg" {
  compartment_id = var.compartment_ocid
  vcn_id         = var.vcn_ocid
  display_name   = "hub-trap-nsg"
  description    = "NSG para honeypot (porta 5001) — apenas Web NSG via proxy"

  ingress_security_rules = [
    # Honeypot port apenas do Web NSG (Nginx faz proxy)
    {
      protocol    = "6"
      source      = oci_core_network_security_group.web_nsg.id
      source_type = "NETWORK_SECURITY_GROUP"
      stateless   = false
      description = "Honeypot do Web NSG"
      tcp_options = {
        destination_port_range = {
          min = 5001
          max = 5001
        }
      }
    },
  ]

  egress_security_rules = [
    # Sem saída de rede (honeypot isolado)
    {
      protocol    = "6"
      destination = "127.0.0.1/32"
      destination_type = "CIDR_BLOCK"
      stateless   = false
      description = "Apenas localhost"
      tcp_options = {
        destination_port_range = {
          min = 1
          max = 65535
        }
      }
    },
  ]
}

# ============================================================
# Outputs
# ============================================================
output "web_nsg_id" {
  value       = oci_core_network_security_group.web_nsg.id
  description = "OCID do Web NSG"
}

output "app_nsg_id" {
  value       = oci_core_network_security_group.app_nsg.id
  description = "OCID do App NSG"
}

output "trap_nsg_id" {
  value       = oci_core_network_security_group.trap_nsg.id
  description = "OCID do Trap NSG"
}

output "web_nsg_ocid" {
  value       = oci_core_network_security_group.web_nsg.id
  description = "OCID do Web NSG (para anexar à instância)"
}