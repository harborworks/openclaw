export const vpc = new sst.aws.Vpc("Vpc", {
  bastion: !$dev,
  nat: !$dev ? "ec2" : undefined,
});
