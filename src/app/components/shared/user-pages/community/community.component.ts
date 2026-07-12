import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClubSummary, CommunityPost, CommunityUser } from '../../../../interfaces/community';
import { CommunityService } from '../../../../services/entities/community.service';
import { renderSafeMarkdown } from '../../../../shared/markdown';

@Component({
    standalone: true,
    selector: 'app-community',
    imports: [DatePipe, NgFor, NgIf, MatIconModule, RouterLink],
    templateUrl: './community.component.html',
    styleUrl: './community.component.sass'
})
export class CommunityComponent implements OnInit {
    users: CommunityUser[] = [];
    posts: CommunityPost[] = [];
    clubs: ClubSummary[] = [];
    isLoading = true;
    loadError = false;

    constructor(private community: CommunityService) { }

    ngOnInit(): void { this.load(); }

    load(): void {
        this.isLoading = true;
        this.loadError = false;
        forkJoin({ users: this.community.users(), feed: this.community.feed(), clubs: this.community.clubs() }).subscribe({
            next: ({ users, feed, clubs }) => {
                this.users = users;
                this.posts = feed.Publicaciones;
                this.clubs = clubs;
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
                this.loadError = true;
            }
        });
    }

    displayName(user: CommunityUser): string { return user.DisplayName || user.Nombre; }
    renderMarkdown(value: string): string { return renderSafeMarkdown(value); }
}
