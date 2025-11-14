#!/bin/bash

show_help() {
  echo "Uso: $0 -p POD_NAMES -n NAMESPACE -f METRICS_FILE -r RUN_TIME"
  echo "  -p POD_NAMES         Lista de nombres de pods a monitorear, separados por comas (ejemplo: pod1,pod2,pod3)"
  echo "  -n NAMESPACE         Namespace de los pods"
  echo "  -f METRICS_FILE      Nombre del archivo para las métricas de CPU y memoria en formato CSV"
  echo "  -r RUN_TIME          Tiempo de ejecución en segundos"
}

POD_NAMES=""
NAMESPACE=""
METRICS_FILE=""
RUN_TIME=""

while getopts "p:n:f:r:h" opt; do
  case $opt in
    p) POD_NAMES="$OPTARG"
    ;;
    n) NAMESPACE="$OPTARG"
    ;;
    f) METRICS_FILE="$OPTARG"
    ;;
    r) RUN_TIME="$OPTARG"
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

if [ -z "$POD_NAMES" ] || [ -z "$NAMESPACE" ] || [ -z "$METRICS_FILE" ] || [ -z "$RUN_TIME" ]; then
  echo "Todos los parámetros son obligatorios."
  show_help
  exit 1
fi

IFS=',' read -r -a POD_NAMES_ARRAY <<< "$POD_NAMES"

get_timestamp() {
  date +"%Y-%m-%d %H:%M:%S.%3N"
}

START_TIME=$(date +%s)

if [ ! -e "$METRICS_FILE" ]; then
  echo "Timestamp,Pod Name,CPU Usage (millicores),Memory Usage (Mi)" > "$METRICS_FILE"
fi

while [ $(($(date +%s) - $START_TIME)) -lt $RUN_TIME ]; do
  for POD_NAME in "${POD_NAMES_ARRAY[@]}"; do
    METRICS=$(kubectl top pod $POD_NAME -n $NAMESPACE --no-headers | awk '{print $2","$3}')
    CPU_USAGE=$(echo $METRICS | cut -d',' -f1)
    MEM_USAGE=$(echo $METRICS | cut -d',' -f2)

    TIMESTAMP=$(get_timestamp)

    echo "$TIMESTAMP,$POD_NAME,$CPU_USAGE,$MEM_USAGE" >> "$METRICS_FILE"
  done

  sleep 5
done
