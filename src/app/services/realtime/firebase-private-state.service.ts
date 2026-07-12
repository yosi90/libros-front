import { Injectable } from '@angular/core';
import { doc, DocumentData, onSnapshot } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { FirebaseSessionService } from './firebase-session.service';

@Injectable({ providedIn: 'root' })
export class FirebasePrivateStateService {
    constructor(private firebaseSession: FirebaseSessionService) { }

    listenToPrivateUser(userId: number): Observable<DocumentData | null> {
        return new Observable(subscriber => {
            const firestore = this.firebaseSession.firestore;
            if (!firestore) {
                subscriber.complete();
                return;
            }

            const unsubscribe = onSnapshot(
                doc(firestore, 'private_users', `libros:${userId}`),
                snapshot => subscriber.next(snapshot.exists() ? snapshot.data() : null),
                error => subscriber.error(error)
            );

            return () => unsubscribe();
        });
    }
}
