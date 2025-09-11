#!/bin/bash

HPA_NAME=$1
POD_NAME=$2
THRESHOLD=$3

get_cpu_percentage() {
  kubectl get hpa -n default | grep "$HPA_NAME" | sed 's/.* \([0-9]*\)%\/[0-9]*%.*/\1/'
}

get_running_pods() {
    kubectl get pod -n default | grep "$POD_NAME" | wc -l
}

running_pods=$(get_running_pods)

echo "Monitoreando la utilización del HPA ..."

while true; do
    cpu_percentage=$(get_cpu_percentage)

    if (( $cpu_percentage > $THRESHOLD )); then
        start_time=$(date "+%Y-%m-%d %H:%M:%S.%3N")
        echo "Se superó el $THRESHOLD% de utilización del HPA: $start_time"
        break
    fi
    sleep 5
done

echo "Monitoreando el número de pods..."

while true; do
    new_running_pods=$(get_running_pods)
    # echo "new_running_pods: $new_running_pods"
    # echo "running_pods: $running_pods"
    if (( $new_running_pods > $running_pods )); then
        end_time=$(date "+%Y-%m-%d %H:%M:%S.%3N")
        echo "Se detectó un nuevo pod: $end_time"
        break
    fi
    sleep 5
done

start_seconds=$(date -d "$start_time" "+%s.%3N")
end_seconds=$(date -d "$end_time" "+%s.%3N")
response_time=$(echo "$end_seconds - $start_seconds" | bc)
echo "Tiempo transcurrido: $response_time segundos"
