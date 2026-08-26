import type { Targets } from "@/lib/store";

export function targetsEqual(left: Targets, right: Targets): boolean {
  return left.monthly.green === right.monthly.green
    && left.monthly.yellow === right.monthly.yellow
    && left.weekly.green === right.weekly.green
    && left.weekly.yellow === right.weekly.yellow;
}
