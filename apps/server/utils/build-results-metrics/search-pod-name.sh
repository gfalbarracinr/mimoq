#!/bin/bash

# Función para mostrar la ayuda
show_help() {
  echo "Uso: $0 -n NAMESPACE -s SEARCH_STRINGS"
  echo "  -n NAMESPACE         Namespace de los pods"
  echo "  -s SEARCH_STRINGS    Lista de cadenas de búsqueda, separadas por comas (ejemplo: api,web,db)"
}

# Inicializar variables
NAMESPACE=""
SEARCH_STRINGS=""

# Obtener los parámetros
while getopts "n:s:h" opt; do
  case $opt in
    n) NAMESPACE="$OPTARG"
    ;;
    s) SEARCH_STRINGS="$OPTARG"
    ;;
    h) show_help
       exit 0
    ;;
    \?) echo "Opción inválida: -$OPTARG" >&2
        show_help
        exit 1
    ;;
  esac
done

# Validar que todos los parámetros estén presentes
if [ -z "$NAMESPACE" ] || [ -z "$SEARCH_STRINGS" ]; then
  echo "Todos los parámetros son obligatorios."
  show_help
  exit 1
fi

# Convertir la lista de cadenas de búsqueda en un array
IFS=',' read -r -a SEARCH_STRINGS_ARRAY <<< "$SEARCH_STRINGS"

# Obtener los nombres de los pods en el namespace
PODS=$(kubectl get pods -n $NAMESPACE --no-headers -o custom-columns=":metadata.name")

# Filtrar los nombres de los pods que contienen alguna de las cadenas de búsqueda
MATCHING_PODS=()
for POD in $PODS; do
  for SEARCH_STRING in "${SEARCH_STRINGS_ARRAY[@]}"; do
    if [[ $POD == *"$SEARCH_STRING"* ]]; then
      MATCHING_PODS+=("$POD")
      break
    fi
  done
done

# Unir los nombres de los pods en una sola cadena separada por comas
MATCHING_PODS_STRING=$(IFS=','; echo "${MATCHING_PODS[*]}")

# Devolver la cadena de nombres de pods
echo "$MATCHING_PODS_STRING"
