import { 
  Body, 
  Controller, 
  Delete, 
  Get, 
  Param, 
  Post, 
  Put,
  Query,
  ParseEnumPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ChaosService } from '../../services/chaos.service';
import { 
  CreateChaosExperimentDto, 
  ChaosType, 
  ChaosExperimentScheduleDto 
} from '../../dtos/chaos.dto';

@ApiTags('Chaos')
@Controller('chaos')
export class ChaosController {
  constructor(private readonly chaosService: ChaosService) {}

  @Post()
  @ApiOperation({ summary: 'Create a chaos experiment' })
  @ApiBody({ type: CreateChaosExperimentDto })
  async createChaosExperiment(@Body() dto: CreateChaosExperimentDto) {
    return this.chaosService.createChaosExperiment(dto);
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a chaos experiment with delays' })
  @ApiBody({ type: ChaosExperimentScheduleDto })
  async scheduleChaosExperiment(@Body() scheduleDto: ChaosExperimentScheduleDto) {
    return this.chaosService.scheduleChaosExperiment(scheduleDto);
  }

  @Get('experiments')
  @ApiOperation({ summary: 'List all chaos experiments in a namespace' })
  @ApiQuery({ name: 'namespace', required: true, description: 'Target namespace' })
  @ApiQuery({ name: 'type', required: false, enum: ChaosType, description: 'Filter by chaos type' })
  async listChaosExperiments(
    @Query('namespace') namespace: string,
    @Query('type') type?: ChaosType,
  ) {
    if (type) {
      return this.chaosService.listChaosExperiments(type, namespace);
    }
    return this.chaosService.listAllChaosExperiments(namespace);
  }

  @Get('experiments/:type/:namespace/:name')
  @ApiOperation({ summary: 'Get status of a chaos experiment' })
  @ApiParam({ name: 'type', enum: ChaosType, description: 'Chaos experiment type' })
  @ApiParam({ name: 'namespace', description: 'Target namespace' })
  @ApiParam({ name: 'name', description: 'Experiment name' })
  async getChaosExperimentStatus(
    @Param('type', new ParseEnumPipe(ChaosType)) type: ChaosType,
    @Param('namespace') namespace: string,
    @Param('name') name: string,
  ) {
    return this.chaosService.getChaosExperimentStatus(type, namespace, name);
  }

  @Put('experiments/:type/:namespace/:name/pause')
  @ApiOperation({ summary: 'Pause a chaos experiment' })
  @ApiParam({ name: 'type', enum: ChaosType, description: 'Chaos experiment type' })
  @ApiParam({ name: 'namespace', description: 'Target namespace' })
  @ApiParam({ name: 'name', description: 'Experiment name' })
  async pauseChaosExperiment(
    @Param('type', new ParseEnumPipe(ChaosType)) type: ChaosType,
    @Param('namespace') namespace: string,
    @Param('name') name: string,
  ) {
    return this.chaosService.pauseChaosExperiment(type, namespace, name);
  }

  @Put('experiments/:type/:namespace/:name/resume')
  @ApiOperation({ summary: 'Resume a paused chaos experiment' })
  @ApiParam({ name: 'type', enum: ChaosType, description: 'Chaos experiment type' })
  @ApiParam({ name: 'namespace', description: 'Target namespace' })
  @ApiParam({ name: 'name', description: 'Experiment name' })
  async resumeChaosExperiment(
    @Param('type', new ParseEnumPipe(ChaosType)) type: ChaosType,
    @Param('namespace') namespace: string,
    @Param('name') name: string,
  ) {
    return this.chaosService.resumeChaosExperiment(type, namespace, name);
  }

  @Delete('experiments/:type/:namespace/:name')
  @ApiOperation({ summary: 'Delete a chaos experiment' })
  @ApiParam({ name: 'type', enum: ChaosType, description: 'Chaos experiment type' })
  @ApiParam({ name: 'namespace', description: 'Target namespace' })
  @ApiParam({ name: 'name', description: 'Experiment name' })
  async deleteChaosExperiment(
    @Param('type', new ParseEnumPipe(ChaosType)) type: ChaosType,
    @Param('namespace') namespace: string,
    @Param('name') name: string,
  ) {
    await this.chaosService.deleteChaosExperiment(type, namespace, name);
    return { message: `Chaos experiment ${name} deleted successfully` };
  }

  @Delete('experiments/by-experiment/:experimentId/:namespace')
  @ApiOperation({ summary: 'Delete all chaos experiments associated with a K6 experiment ID' })
  @ApiParam({ name: 'experimentId', description: 'K6 Experiment ID' })
  @ApiParam({ name: 'namespace', description: 'Target namespace' })
  async deleteChaosExperimentsByExperimentId(
    @Param('experimentId') experimentId: string,
    @Param('namespace') namespace: string,
  ) {
    await this.chaosService.deleteChaosExperimentsByExperimentId(experimentId, namespace);
    return { message: `All chaos experiments associated with experiment ID ${experimentId} deleted successfully` };
  }
}

