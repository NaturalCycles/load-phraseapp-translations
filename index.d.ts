/** Declaration file generated by dts-gen */


declare namespace phraseapp {
    export class PhraseappLoader {
        constructor(options: any);

        configure(options: any): void;

        download(callback: Function): void;

        fetchTranslationFile(locale: string, callback: Function): void;

        downloadTranslationFile(locale: string, callback: Function): void;

        fetchProjects(callback: Function): void;

        fetchLocales(callback: Function): void;

        fetchLocaleCodes(callback: Function): void;
    }
}

export = phraseapp
