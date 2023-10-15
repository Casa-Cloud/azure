#!/bin/sh
export var1="1"

# Variable block
let "randomIdentifier=$RANDOM*$RANDOM"
location="East US"
failoverLocation="South Central US"
resourceGroup="test-$randomIdentifier"
tag="test-tag"
account="test-cosmos-account-$randomIdentifier" #needs to be lower case
database="testDB"
container="container1"
partitionKey="/id"

# Create a resource group
echo "Creating $resourceGroup in $location..."
az group create --name $resourceGroup --location "$location" --tags $tag

# Create a Cosmos account for SQL API
echo "Creating $account"
az cosmosdb create \
--name $account \
--resource-group $resourceGroup \
--default-consistency-level Eventual \
--locations regionName="$location" \
failoverPriority=0 \
isZoneRedundant=False \
--locations regionName="$failoverLocation" \
failoverPriority=1

# Create a SQL API container
echo "Creating $container with $maxThroughput"
az cosmosdb sql container create \
--account-name $account \
--resource-group $resourceGroup \
--database-name $database \
--name $container \
--partition-key-path $partitionKey \
--throughput 400 