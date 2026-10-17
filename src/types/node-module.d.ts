declare module "node:module" {
  export function createRequire(id: string): (specifier: string) => unknown;
}
