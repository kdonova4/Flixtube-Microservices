terraform {
    required_providers {
        azurerm = {
            source = "hashicorp/azurerm"
            version = "~> 4.53.0"
        }
    }

    required_version = ">= 1.5.6"
}

provider "azurerm" {
    features {}

    subscription_id = "20a75a2f-e5d7-41d6-b68b-22be870317c3"
}