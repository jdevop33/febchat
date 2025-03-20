// Minimist declaration for TypeScript
declare module 'minimist' {
  function minimist(args: string[], opts?: any): { [key: string]: any };
  export = minimist;
}
