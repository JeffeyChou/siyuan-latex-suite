declare module "*.scss" {
    const content: Record<string, string>;
    export default content;
}

declare module "*?raw" {
    const content: string;
    export default content;
}
