import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Character } from '../interfaces/character';
import { Chapter } from '../interfaces/chapter';

@Injectable({
    providedIn: 'root'
})
export class EmmittersService {

    private newCharacter = new Subject<Character>();
    newCharacter$ = this.newCharacter.asObservable();
    private newChapter = new Subject<Chapter>();
    newChapter$ = this.newChapter.asObservable();

    private updatedCharacter = new Subject<Character>();
    updatedCharacter$ = this.updatedCharacter.asObservable();
    private updatedChapter = new Subject<Chapter>();
    updatedChapter$ = this.updatedChapter.asObservable();

    constructor() { }

    sendNewCharacter(character: Character) {
        this.newCharacter.next(character);
    }

    sendNewChapter(chapter: Chapter) {
        this.newChapter.next(chapter);
    }

    sendUpdatedCharacter(character: Character) {
        this.updatedCharacter.next(character);
    }

    sendUpdatedChapter(chapter: Chapter) {
        this.updatedChapter.next(chapter);
    }
}
