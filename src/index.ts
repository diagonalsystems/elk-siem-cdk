import {
  Tag, Construct, Stack, StackProps,
} from '@aws-cdk/core';
import { IVpc } from '@aws-cdk/aws-ec2';
import ecs from './ecs';
import elasticsearch from './elasticsearch';
import pomerium from './pomerium';
import kibana from './kibana';

const DEFAULT_ELK_VERSION = '7.6.1';
const DEFAULT_CPU = '512';
const DEFAULT_MEMORY_MIB = '1024';
const DEFAULT_VOLUME_SIZE = 32;

interface Props {
  stackProps: StackProps;
  vpc: IVpc;
  url: string;
  elkVersion?: string;
  cpu?: string;
  memoryMiB?: string;
  desiredCount?: number;
  volumeSize?: number;
  minCapacity?: number;
  maxCapacity?: number;
}

export default function createElkSiem(scope: Construct, props: Props): Stack {
  const { stackProps, vpc, url } = props;
  const stack = new Stack(scope, 'ElkSiem', stackProps);

  const elkVersion = props.elkVersion || DEFAULT_ELK_VERSION;
  const cpu = props.cpu || DEFAULT_CPU;
  const memoryMiB = props.memoryMiB || DEFAULT_MEMORY_MIB;
  const volumeSize = props.volumeSize || DEFAULT_VOLUME_SIZE;
  const desiredCount = props.desiredCount || 0;
  const minCapacity = props.minCapacity || 0;
  const maxCapacity = props.maxCapacity || 1;
  const mountPath = '/opt/es';

  const { cluster } = ecs(stack, {
    vpc,
    volumeSize,
    minCapacity,
    maxCapacity,
    mountPath,
  });

  elasticsearch(stack, {
    cluster,
    elkVersion,
    cpu,
    memoryMiB,
    mountPath,
    desiredCount,
  });

  pomerium(stack, {
    cluster,
    url,
  });

  kibana(stack, {
    cluster,
    elkVersion,
  });

  Tag.add(stack, 'Workload', 'ELK-SIEM');

  return stack;
}
