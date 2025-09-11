<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

En este repositorio se encuentra el backend del Sistema de Experimentación MiMoQ. Este fue el proyecto presentado como trabajo de tesis de Ingeniería de Sistemas en la Universidad Javeriana de Bogotá.

## Instalación de dependencias

```bash
$ npm install
```

## Ejecutar la aplicación

```bash
# development
$ npm run start
```
## Complementos necesarios
Para que esta aplicación funcione completamente, es necesario instalar otras herramientas. En este caso se hizo uso de kubernetes, prometheus, grafana y helm.

### Entorno de kubernetes
Para la ejecución de este proyecto se utilizó MicroK8s. La instalación se realizó gracias a la documentación de la página oficial: <a href="https://microk8s.io/docs/getting-started" target="_blank">MicroK8s</a>. 
Para que la configuración de MicroK8s se relacione correctamente con los archivos que utiliza kubernetes:

```bash
sudo microk8s refresh-certs -e ca.crt
microk8s config > ~/.kube/config
# Conceder permisos
chmod 600 /home/{usuario}/.kube/config
```


### Prometheus y Grafana
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/kube-prometheus-stack
```
Una vez se instale, revisar la ip del servicio “prometheus-prometheus-node-exporter” creado en kubernetes. En el archivo “values” cambiar la línea 3765:

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/3e970946-2a8c-48e2-bc59-dbf43368ac72/beeff861-08c5-4daf-bcc4-0ba453489b23/Untitled.png)

Dado que se modificó el archivo values.yaml, es necesario actualizar el repositorio de prometheus y grafana:

```bash
helm upgrade prometheus prometheus-community/kube-prometheus-stack -f values.yaml
```
#### Ejecución de Prometheus y Grafana
```bash
kubectl port-forward prometheus-prometheus-kube-prometheus-prometheus-0 9090
kubectl port-forward svc/prometheus-grafana 8080:80
```

## Test

```bash
# unit tests
$ npm run test
```

## Support

Nest 

Nest es proyecto de código abierto con licencia del MIT.

MiMoQ

MiMoQ es un proyecto de código abierto que pretende ampliarse con ayuda de la comunidad.

## Autores

- Mauren Rivera Bautista
- Katherine Castro Floréz
- Kevin Floréz
- Anderson Alvarado

## Licencia

[MIT licensed](LICENSE).
