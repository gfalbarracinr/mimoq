import { Module } from "@nestjs/common";
import { K6Service } from "./k6.service";
import { MetricsProcessorService } from "./metrics-processor.service";
import { KubernetesModule } from "src/kubernetes/kubernetes.module";

@Module({
    providers: [K6Service, MetricsProcessorService],
    exports: [K6Service, MetricsProcessorService],
    imports: [KubernetesModule]
})

export class K6Module {}