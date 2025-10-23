# To run locally the APP

- Install [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/)

- Install [Tilt](https://docs.tilt.dev/install.html)

- Install [Helm](https://helm.sh/docs/intro/install/)

- run the following command to create a local cluuster 

    `kind create cluster --config kind.yaml`

- run the following command to download K6 inside the cluster

    `make setup-k6-operator`

- run the following command to download Prometheus inside the cluster

    `make install-monitoring`

- run tilt up



