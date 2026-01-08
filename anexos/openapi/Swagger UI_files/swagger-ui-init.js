
window.onload = function() {
  // Build a system
  let url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  let options = {
  "swaggerDoc": {
    "openapi": "3.0.0",
    "paths": {
      "/api": {
        "get": {
          "operationId": "AppController_getHello",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          }
        }
      },
      "/api/usuario": {
        "get": {
          "operationId": "UsuarioController_findAll",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Usuario"
          ]
        },
        "post": {
          "operationId": "UsuarioController_createUser",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateUsuarioDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Usuario"
          ]
        }
      },
      "/api/usuario/{id}": {
        "get": {
          "operationId": "UsuarioController_findOne",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Usuario"
          ]
        },
        "put": {
          "operationId": "UsuarioController_updateUser",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateUsuarioDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Usuario"
          ]
        },
        "delete": {
          "operationId": "UsuarioController_removeUser",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Usuario"
          ]
        }
      },
      "/api/usuario/correo/{correo_usuario}": {
        "get": {
          "operationId": "UsuarioController_findOneByEmail",
          "parameters": [
            {
              "name": "correo_usuario",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Usuario"
          ]
        }
      },
      "/api/usuario/{id}/{pssActual}/{passNew}": {
        "put": {
          "operationId": "UsuarioController_updatePass",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            },
            {
              "name": "pssActual",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "passNew",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Usuario"
          ]
        }
      },
      "/api/rol-usuario": {
        "get": {
          "operationId": "RolUsuarioController_find",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Rol Usuario"
          ]
        },
        "post": {
          "operationId": "RolUsuarioController_createUsuario",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateRolUsuarioDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Rol Usuario"
          ]
        }
      },
      "/api/rol-usuario/{nombre}": {
        "get": {
          "operationId": "RolUsuarioController_findOneByName",
          "parameters": [
            {
              "name": "nombre",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Rol Usuario"
          ]
        }
      },
      "/api/metrica": {
        "get": {
          "operationId": "MetricaController_find",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Metrica"
          ]
        },
        "post": {
          "operationId": "MetricaController_createMetrica",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateMetricaDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Metrica"
          ]
        }
      },
      "/api/metrica/{nombre}": {
        "get": {
          "operationId": "MetricaController_findOneByName",
          "parameters": [
            {
              "name": "nombre",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Metrica"
          ]
        }
      },
      "/api/atributo": {
        "get": {
          "operationId": "AtributoController_find",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Atributo"
          ]
        },
        "post": {
          "operationId": "AtributoController_createAtributo",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateAtributoDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Atributo"
          ]
        }
      },
      "/api/atributo/{nombre}": {
        "get": {
          "operationId": "AtributoController_findOneByName",
          "parameters": [
            {
              "name": "nombre",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Atributo"
          ]
        }
      },
      "/api/subatributo": {
        "get": {
          "operationId": "SubatributoController_find",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Subatributo"
          ]
        },
        "post": {
          "operationId": "SubatributoController_createSubatributo",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateSubatributoDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Subatributo"
          ]
        }
      },
      "/api/subatributo/{nombre}": {
        "get": {
          "operationId": "SubatributoController_findOneByName",
          "parameters": [
            {
              "name": "nombre",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Subatributo"
          ]
        }
      },
      "/api/proyecto": {
        "get": {
          "operationId": "ProyectoController_findAll",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Proyecto"
          ]
        },
        "post": {
          "operationId": "ProyectoController_createProject",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateProjectDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Proyecto"
          ]
        }
      },
      "/api/proyecto/{id}": {
        "get": {
          "operationId": "ProyectoController_findOne",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Proyecto"
          ]
        },
        "put": {
          "operationId": "ProyectoController_updateProject",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateProjectDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Proyecto"
          ]
        },
        "delete": {
          "operationId": "ProyectoController_remove",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Proyecto"
          ]
        }
      },
      "/api/proyecto/usuario/{id}": {
        "get": {
          "operationId": "ProyectoController_findAllByUser",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Proyecto"
          ]
        }
      },
      "/api/despliegue": {
        "get": {
          "operationId": "DespliegueController_findAll",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Despliegue"
          ]
        }
      },
      "/api/despliegue/{id}": {
        "get": {
          "operationId": "DespliegueController_findOne",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Despliegue"
          ]
        },
        "put": {
          "operationId": "DespliegueController_updateDeployment",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateDeploymentDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Despliegue"
          ]
        }
      },
      "/api/despliegue/nombreHelm/{nombre}": {
        "get": {
          "operationId": "DespliegueController_findOneByHelmName",
          "parameters": [
            {
              "name": "nombre",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Despliegue"
          ]
        },
        "delete": {
          "operationId": "DespliegueController_removeDeploymentHelm",
          "parameters": [
            {
              "name": "nombre",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Despliegue"
          ]
        }
      },
      "/api/despliegue/usuario/{id}": {
        "get": {
          "operationId": "DespliegueController_findAllByUser",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Despliegue"
          ]
        }
      },
      "/api/despliegue/individual": {
        "post": {
          "operationId": "DespliegueController_createIndividualDeployment",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateDeploymentDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Despliegue"
          ]
        }
      },
      "/api/despliegue/multiple": {
        "post": {
          "operationId": "DespliegueController_createMultipleDeployment",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateDeploymentDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Despliegue"
          ]
        }
      },
      "/api/despliegue/{id}/nombreHelm/{nombre}": {
        "delete": {
          "operationId": "DespliegueController_removeDeployment",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            },
            {
              "name": "nombre",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Despliegue"
          ]
        }
      },
      "/api/experimento/descargar/{nombre_carpeta}/{nombre_archivo}": {
        "get": {
          "operationId": "ExperimentoController_descargarArchivo",
          "parameters": [
            {
              "name": "nombre_carpeta",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "nombre_archivo",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Experimento"
          ]
        }
      },
      "/api/experimento": {
        "get": {
          "operationId": "ExperimentoController_findAll",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Experimento"
          ]
        },
        "post": {
          "operationId": "ExperimentoController_createExperiment",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateExperimentoDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Experimento"
          ]
        }
      },
      "/api/experimento/{id}/status": {
        "get": {
          "operationId": "ExperimentoController_getStatus",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Experimento"
          ]
        }
      },
      "/api/experimento/{id}": {
        "get": {
          "operationId": "ExperimentoController_findOne",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Experimento"
          ]
        },
        "put": {
          "operationId": "ExperimentoController_updateExperiment",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateExperimentoDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Experimento"
          ]
        },
        "delete": {
          "operationId": "ExperimentoController_removeExperiment",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Experimento"
          ]
        }
      },
      "/api/experimento/archivos/{id}": {
        "get": {
          "operationId": "ExperimentoController_findFiles",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Experimento"
          ]
        }
      },
      "/api/experimento/dashboard": {
        "post": {
          "operationId": "ExperimentoController_buildDashboard",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateExperimentoDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Experimento"
          ]
        }
      },
      "/api/experimento/{id}/check-files": {
        "get": {
          "operationId": "ExperimentoController_checkFiles",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Experimento"
          ]
        }
      },
      "/api/experimento/{id}/regenerate-files": {
        "post": {
          "operationId": "ExperimentoController_regenerateFiles",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Experimento"
          ]
        }
      },
      "/api/carga": {
        "get": {
          "operationId": "CargaController_findAll",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Carga"
          ]
        },
        "post": {
          "operationId": "CargaController_createCarga",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateCargaDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Carga"
          ]
        }
      },
      "/api/carga/{id}": {
        "get": {
          "operationId": "CargaController_findOne",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Carga"
          ]
        },
        "put": {
          "operationId": "CargaController_updateCarga",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateCargaDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Carga"
          ]
        },
        "delete": {
          "operationId": "CargaController_removeCarga",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Carga"
          ]
        }
      },
      "/api/carga/experimento": {
        "post": {
          "operationId": "CargaController_createExperiment",
          "parameters": [],
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Carga"
          ]
        }
      },
      "/api/tablero/descargar/{nombre_experimento}/{nombre_despliegue}": {
        "get": {
          "operationId": "TableroController_descargarArchivo",
          "parameters": [
            {
              "name": "nombre_experimento",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "nombre_despliegue",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Tablero"
          ]
        }
      },
      "/api/chaos": {
        "post": {
          "operationId": "ChaosController_createChaosExperiment",
          "summary": "Create a chaos experiment",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateChaosExperimentDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Chaos"
          ]
        }
      },
      "/api/chaos/schedule": {
        "post": {
          "operationId": "ChaosController_scheduleChaosExperiment",
          "summary": "Schedule a chaos experiment with delays",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ChaosExperimentScheduleDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Chaos"
          ]
        }
      },
      "/api/chaos/experiments": {
        "get": {
          "operationId": "ChaosController_listChaosExperiments",
          "summary": "List all chaos experiments in a namespace",
          "parameters": [
            {
              "name": "namespace",
              "required": true,
              "in": "query",
              "description": "Target namespace",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "type",
              "required": false,
              "in": "query",
              "description": "Filter by chaos type",
              "schema": {
                "enum": [
                  "pod-failure",
                  "pod-kill",
                  "container-kill",
                  "network-partition",
                  "network-delay",
                  "network-loss",
                  "network-bandwidth",
                  "cpu-stress",
                  "memory-stress",
                  "io-stress"
                ],
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Chaos"
          ]
        }
      },
      "/api/chaos/experiments/{type}/{namespace}/{name}": {
        "get": {
          "operationId": "ChaosController_getChaosExperimentStatus",
          "summary": "Get status of a chaos experiment",
          "parameters": [
            {
              "name": "type",
              "required": true,
              "in": "path",
              "description": "Chaos experiment type",
              "schema": {
                "enum": [
                  "pod-failure",
                  "pod-kill",
                  "container-kill",
                  "network-partition",
                  "network-delay",
                  "network-loss",
                  "network-bandwidth",
                  "cpu-stress",
                  "memory-stress",
                  "io-stress"
                ],
                "type": "string"
              }
            },
            {
              "name": "namespace",
              "required": true,
              "in": "path",
              "description": "Target namespace",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "name",
              "required": true,
              "in": "path",
              "description": "Experiment name",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Chaos"
          ]
        },
        "delete": {
          "operationId": "ChaosController_deleteChaosExperiment",
          "summary": "Delete a chaos experiment",
          "parameters": [
            {
              "name": "type",
              "required": true,
              "in": "path",
              "description": "Chaos experiment type",
              "schema": {
                "enum": [
                  "pod-failure",
                  "pod-kill",
                  "container-kill",
                  "network-partition",
                  "network-delay",
                  "network-loss",
                  "network-bandwidth",
                  "cpu-stress",
                  "memory-stress",
                  "io-stress"
                ],
                "type": "string"
              }
            },
            {
              "name": "namespace",
              "required": true,
              "in": "path",
              "description": "Target namespace",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "name",
              "required": true,
              "in": "path",
              "description": "Experiment name",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Chaos"
          ]
        }
      },
      "/api/chaos/experiments/{type}/{namespace}/{name}/pause": {
        "put": {
          "operationId": "ChaosController_pauseChaosExperiment",
          "summary": "Pause a chaos experiment",
          "parameters": [
            {
              "name": "type",
              "required": true,
              "in": "path",
              "description": "Chaos experiment type",
              "schema": {
                "enum": [
                  "pod-failure",
                  "pod-kill",
                  "container-kill",
                  "network-partition",
                  "network-delay",
                  "network-loss",
                  "network-bandwidth",
                  "cpu-stress",
                  "memory-stress",
                  "io-stress"
                ],
                "type": "string"
              }
            },
            {
              "name": "namespace",
              "required": true,
              "in": "path",
              "description": "Target namespace",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "name",
              "required": true,
              "in": "path",
              "description": "Experiment name",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Chaos"
          ]
        }
      },
      "/api/chaos/experiments/{type}/{namespace}/{name}/resume": {
        "put": {
          "operationId": "ChaosController_resumeChaosExperiment",
          "summary": "Resume a paused chaos experiment",
          "parameters": [
            {
              "name": "type",
              "required": true,
              "in": "path",
              "description": "Chaos experiment type",
              "schema": {
                "enum": [
                  "pod-failure",
                  "pod-kill",
                  "container-kill",
                  "network-partition",
                  "network-delay",
                  "network-loss",
                  "network-bandwidth",
                  "cpu-stress",
                  "memory-stress",
                  "io-stress"
                ],
                "type": "string"
              }
            },
            {
              "name": "namespace",
              "required": true,
              "in": "path",
              "description": "Target namespace",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "name",
              "required": true,
              "in": "path",
              "description": "Experiment name",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Chaos"
          ]
        }
      },
      "/api/chaos/experiments/by-experiment/{experimentId}/{namespace}": {
        "delete": {
          "operationId": "ChaosController_deleteChaosExperimentsByExperimentId",
          "summary": "Delete all chaos experiments associated with a K6 experiment ID",
          "parameters": [
            {
              "name": "experimentId",
              "required": true,
              "in": "path",
              "description": "K6 Experiment ID",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "namespace",
              "required": true,
              "in": "path",
              "description": "Target namespace",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "tags": [
            "Chaos"
          ]
        }
      },
      "/api/auth/login": {
        "post": {
          "operationId": "AuthController_login",
          "parameters": [],
          "requestBody": {
            "required": true,
            "description": "Credenciales de usuario",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Usuario"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "tags": [
            "Auth"
          ]
        }
      }
    },
    "info": {
      "title": "Api MiMoQ",
      "description": "API REST para la aplicación de experimentación MiMoQ",
      "version": "1.0.0",
      "contact": {}
    },
    "tags": [],
    "servers": [],
    "components": {
      "schemas": {
        "CreateUsuarioDto": {
          "type": "object",
          "properties": {
            "nombre": {
              "type": "string"
            },
            "correo": {
              "type": "string"
            },
            "documento": {
              "type": "number"
            },
            "contrasena": {
              "type": "string"
            },
            "fk_id_rol_usuario": {
              "type": "number"
            }
          },
          "required": [
            "nombre",
            "correo",
            "documento",
            "contrasena",
            "fk_id_rol_usuario"
          ]
        },
        "UpdateUsuarioDto": {
          "type": "object",
          "properties": {
            "nombre": {
              "type": "string"
            },
            "correo": {
              "type": "string"
            },
            "documento": {
              "type": "number"
            },
            "contrasena": {
              "type": "string"
            },
            "fk_id_rol_usuario": {
              "type": "number"
            }
          }
        },
        "CreateRolUsuarioDto": {
          "type": "object",
          "properties": {
            "nombre": {
              "type": "string"
            }
          },
          "required": [
            "nombre"
          ]
        },
        "CreateMetricaDto": {
          "type": "object",
          "properties": {
            "nombre": {
              "type": "string"
            },
            "descripcion": {
              "type": "string"
            },
            "formula": {
              "type": "string"
            },
            "nombre_prometheus": {
              "type": "string"
            },
            "grupo": {
              "type": "string"
            },
            "submetricas": {
              "type": "string"
            },
            "fk_id_subatributo": {
              "type": "number"
            }
          },
          "required": [
            "nombre",
            "descripcion",
            "formula",
            "nombre_prometheus",
            "grupo",
            "submetricas",
            "fk_id_subatributo"
          ]
        },
        "CreateAtributoDto": {
          "type": "object",
          "properties": {
            "nombre": {
              "type": "string"
            },
            "descripcion": {
              "type": "string"
            }
          },
          "required": [
            "nombre",
            "descripcion"
          ]
        },
        "CreateSubatributoDto": {
          "type": "object",
          "properties": {
            "nombre": {
              "type": "string"
            },
            "descripcion": {
              "type": "string"
            },
            "fk_id_atributo": {
              "type": "number"
            }
          },
          "required": [
            "nombre",
            "descripcion",
            "fk_id_atributo"
          ]
        },
        "CreateProjectDto": {
          "type": "object",
          "properties": {
            "nombre": {
              "type": "string"
            },
            "descripcion": {
              "type": "string"
            },
            "url_repositorio": {
              "type": "string"
            },
            "urls_repositorios": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "nombres_microservicios": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "docker_compose": {
              "type": "boolean"
            },
            "dockerfile": {
              "type": "boolean"
            },
            "fk_usuario": {
              "type": "number"
            }
          },
          "required": [
            "nombre",
            "descripcion",
            "url_repositorio",
            "urls_repositorios",
            "nombres_microservicios",
            "docker_compose",
            "dockerfile",
            "fk_usuario"
          ]
        },
        "UpdateProjectDto": {
          "type": "object",
          "properties": {
            "nombre": {
              "type": "string"
            },
            "descripcion": {
              "type": "string"
            },
            "url_repositorio": {
              "type": "string"
            },
            "urls_repositorios": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "nombres_microservicios": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "docker_compose": {
              "type": "boolean"
            },
            "dockerfile": {
              "type": "boolean"
            },
            "fk_usuario": {
              "type": "number"
            }
          }
        },
        "CreateDeploymentDto": {
          "type": "object",
          "properties": {
            "nombre_helm": {
              "type": "string"
            },
            "replicas": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "namespace": {
              "type": "string"
            },
            "autoescalado": {
              "type": "boolean"
            },
            "min_replicas": {
              "type": "number"
            },
            "max_replicas": {
              "type": "number"
            },
            "utilization_cpu": {
              "type": "number"
            },
            "fk_proyecto": {
              "type": "number"
            }
          },
          "required": [
            "nombre_helm",
            "replicas",
            "namespace",
            "autoescalado",
            "min_replicas",
            "max_replicas",
            "utilization_cpu",
            "fk_proyecto"
          ]
        },
        "UpdateDeploymentDto": {
          "type": "object",
          "properties": {
            "nombre_helm": {
              "type": "string"
            },
            "replicas": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "namespace": {
              "type": "string"
            },
            "autoescalado": {
              "type": "boolean"
            },
            "min_replicas": {
              "type": "number"
            },
            "max_replicas": {
              "type": "number"
            },
            "utilization_cpu": {
              "type": "number"
            },
            "fk_proyecto": {
              "type": "number"
            }
          }
        },
        "CreateExperimentoDto": {
          "type": "object",
          "properties": {
            "nombre": {
              "type": "string"
            },
            "duracion": {
              "type": "string"
            },
            "cant_replicas": {
              "type": "number"
            },
            "endpoints": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "iframes": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "fk_ids_despliegues": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "fk_ids_metricas": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "fk_id_carga": {
              "type": "number"
            }
          },
          "required": [
            "nombre",
            "duracion",
            "cant_replicas",
            "endpoints",
            "iframes",
            "fk_ids_despliegues",
            "fk_ids_metricas",
            "fk_id_carga"
          ]
        },
        "UpdateExperimentoDto": {
          "type": "object",
          "properties": {
            "nombre": {
              "type": "string"
            },
            "duracion": {
              "type": "string"
            },
            "cant_replicas": {
              "type": "number"
            },
            "endpoints": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "iframes": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "fk_ids_despliegues": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "fk_ids_metricas": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "fk_id_carga": {
              "type": "number"
            }
          }
        },
        "CreateCargaDto": {
          "type": "object",
          "properties": {
            "cant_usuarios": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "duracion_picos": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "duracion_total": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "cant_usuarios",
            "duracion_picos",
            "duracion_total"
          ]
        },
        "UpdateCargaDto": {
          "type": "object",
          "properties": {
            "cant_usuarios": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "duracion_picos": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "duracion_total": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        },
        "NetworkDelaySpec": {
          "type": "object",
          "properties": {
            "latency": {
              "type": "string",
              "description": "Delay time in milliseconds",
              "example": 1000
            },
            "jitter": {
              "type": "string",
              "description": "Jitter in milliseconds",
              "example": 100
            },
            "correlation": {
              "type": "string",
              "description": "Correlation percentage",
              "example": "50"
            }
          },
          "required": [
            "latency"
          ]
        },
        "NetworkLossSpec": {
          "type": "object",
          "properties": {
            "loss": {
              "type": "string",
              "description": "Loss percentage",
              "example": "50"
            },
            "correlation": {
              "type": "string",
              "description": "Correlation percentage",
              "example": "50"
            }
          },
          "required": [
            "loss"
          ]
        },
        "NetworkBandwidthSpec": {
          "type": "object",
          "properties": {
            "rate": {
              "type": "string",
              "description": "Bandwidth limit",
              "example": "1mbps"
            }
          },
          "required": [
            "rate"
          ]
        },
        "StressSpec": {
          "type": "object",
          "properties": {
            "workers": {
              "type": "number",
              "description": "Stress workers count",
              "example": 4
            },
            "load": {
              "type": "number",
              "description": "Load percentage",
              "example": 80
            },
            "duration": {
              "type": "string",
              "description": "Duration in seconds",
              "example": 60
            }
          },
          "required": [
            "workers",
            "load",
            "duration"
          ]
        },
        "CreateChaosExperimentDto": {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "description": "Type of chaos experiment",
              "enum": [
                "pod-failure",
                "pod-kill",
                "container-kill",
                "network-partition",
                "network-delay",
                "network-loss",
                "network-bandwidth",
                "cpu-stress",
                "memory-stress",
                "io-stress"
              ]
            },
            "namespace": {
              "type": "string",
              "description": "Target namespace"
            },
            "selector": {
              "type": "object",
              "description": "Target pod labels selector",
              "example": {
                "app": "server"
              }
            },
            "mode": {
              "type": "string",
              "description": "Chaos mode",
              "enum": [
                "one",
                "all",
                "fixed",
                "fixed-percent",
                "random-max-percent"
              ],
              "default": "one"
            },
            "value": {
              "type": "number",
              "description": "Value for fixed/fixed-percent mode"
            },
            "duration": {
              "type": "string",
              "description": "Duration of the chaos experiment",
              "example": "30s"
            },
            "networkDelay": {
              "description": "Network delay specification",
              "allOf": [
                {
                  "$ref": "#/components/schemas/NetworkDelaySpec"
                }
              ]
            },
            "networkLoss": {
              "description": "Network loss specification",
              "allOf": [
                {
                  "$ref": "#/components/schemas/NetworkLossSpec"
                }
              ]
            },
            "networkBandwidth": {
              "description": "Network bandwidth specification",
              "allOf": [
                {
                  "$ref": "#/components/schemas/NetworkBandwidthSpec"
                }
              ]
            },
            "stress": {
              "description": "Stress specification",
              "allOf": [
                {
                  "$ref": "#/components/schemas/StressSpec"
                }
              ]
            },
            "name": {
              "type": "string",
              "description": "Experiment name"
            },
            "experimentId": {
              "type": "string",
              "description": "K6 Experiment ID to associate with"
            }
          },
          "required": [
            "type",
            "namespace",
            "selector",
            "mode",
            "duration"
          ]
        },
        "ChaosExperimentScheduleDto": {
          "type": "object",
          "properties": {
            "experiment": {
              "description": "Chaos experiment configuration",
              "allOf": [
                {
                  "$ref": "#/components/schemas/CreateChaosExperimentDto"
                }
              ]
            },
            "startDelay": {
              "type": "string",
              "description": "Start delay before chaos (e.g., \"10s\")",
              "example": "10s"
            },
            "endDelay": {
              "type": "string",
              "description": "End delay after test ends (e.g., \"5s\")",
              "example": "5s"
            }
          },
          "required": [
            "experiment",
            "startDelay",
            "endDelay"
          ]
        },
        "Usuario": {
          "type": "object",
          "properties": {}
        }
      }
    }
  },
  "customOptions": {}
};
  url = options.swaggerUrl || url
  let urls = options.swaggerUrls
  let customOptions = options.customOptions
  let spec1 = options.swaggerDoc
  let swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (let attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  let ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.initOAuth) {
    ui.initOAuth(customOptions.initOAuth)
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }
  
  window.ui = ui
}
