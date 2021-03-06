export interface CodeTree {
    spells: CodeSection;
    maps: CodeSection;
    obstacles: CodeSection;
    icons: CodeSection;
    sounds: CodeSection;
    constants: CodeConstants;

    [key: string]: CodeSection;
}

export interface CodeSection {
    [key: string]: string;
}

export interface CodeConstants extends CodeSection {
    mod: string;
    matchmaking: string;
    world: string;
    obstacle: string;
    hero: string;
    choices: string;
    visuals: string;
    ai: string;
}

export type ErrorTree = {
    [K in keyof CodeTree]?: ErrorSection;
}

export interface ErrorSection {
    [key: string]: string;
}

export interface Entity {
    id: string;
}

export class ParseException {
    errors: ErrorTree;

    constructor(errors: ErrorTree) {
        this.errors = errors;
    }
}