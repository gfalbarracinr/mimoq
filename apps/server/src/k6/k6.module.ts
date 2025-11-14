import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { K6Service } from "./k6.service";
import { MetricsProcessorService } from "./metrics-processor.service";
import { KubernetesModule } from "src/kubernetes/kubernetes.module";
import { Experimento } from "../experimento/entities/experimento.entity";

@Module({
    providers: [K6Service, MetricsProcessorService],
    exports: [K6Service, MetricsProcessorService],
    imports: [
        KubernetesModule,
        TypeOrmModule.forFeature([Experimento])
    ]
})

export class K6Module {}