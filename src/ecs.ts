import { Stack } from '@aws-cdk/core';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as autoscaling from '@aws-cdk/aws-autoscaling';
import { ManagedPolicies } from 'cdk-constants';

interface EcsProps {
  vpc: ec2.IVpc;
  volumeSize: number;
  minCapacity: number;
  maxCapacity: number;
  mountPath: string;
}

export default function createEcs(stack: Stack, props: EcsProps): { cluster: ecs.Cluster } {
  const {
    vpc, volumeSize, minCapacity, maxCapacity, mountPath,
  } = props;

  const clusterName = 'ElkSiemCluster';
  const deviceName = 'xvdg';

  const volume = ec2.BlockDeviceVolume.ebs(volumeSize, {
    encrypted: true,
  });

  const userData = ec2.UserData.forLinux();

  userData.addCommands(...[
    `mkfs -t ext4 /dev/${deviceName}`,
    `mkdir ${mountPath}`,
    `mount /dev/${deviceName} ${mountPath}`,
    `echo /dev/${deviceName}  ${mountPath} ext4 defaults,nofail 0 2 >> /etc/fstab`,
  ]);

  const machineImage = ec2.MachineImage.latestAmazonLinux({
    userData,
    storage: ec2.AmazonLinuxStorage.EBS,
  });

  const cluster = new ecs.Cluster(stack, 'ElkCluster', {
    vpc,
    clusterName,
  });

  const instanceType = ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.SMALL);

  const opts: ecs.AddCapacityOptions = {
    minCapacity,
    maxCapacity,
    machineImage,
    instanceType,
  };

  cluster.addCapacity('ElkSiemCapacityProvider', opts);

  const autoscalingGroup = new autoscaling.AutoScalingGroup(stack, 'AutoScaling', {
    ...opts,
    vpc,
    machineImage,
    blockDevices: [{
      volume,
      deviceName,
    }],
  });

  const instanceRolePolicy = ManagedPolicy.fromAwsManagedPolicyName(
    ManagedPolicies.AMAZON_SSM_MANAGED_INSTANCE_CORE,
  );

  autoscalingGroup.role.addManagedPolicy(instanceRolePolicy);

  cluster.addAutoScalingGroup(autoscalingGroup);

  return {
    cluster,
  };
}
