export class Despliegue {
    constructor(
        public nombre_helm: string,
        public replicas: number[],
        public namespace: string,
        public fk_proyecto: number
    ) { }
}