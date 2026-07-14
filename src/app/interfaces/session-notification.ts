import { AppToastAction, AppToastType } from '../shared/toast/app-toast';

export interface SessionNotification {
    id: string;
    dedupeKey: string;
    type: AppToastType;
    title: string;
    message: string;
    firstOccurredAt: number;
    lastOccurredAt: number;
    repeatCount: number;
    seen: boolean;
    action?: AppToastAction;
}

export type DecisionActionAppearance = 'primary' | 'secondary' | 'danger';

export interface DecisionNoticeAction extends AppToastAction {
    id: string;
    appearance: DecisionActionAppearance;
    closeOnSelect?: boolean;
    showInCenter?: boolean;
}

export interface DecisionNotice {
    id: string;
    title: string;
    message: string;
    icon?: string;
    type: AppToastType;
    dismissible: boolean;
    actions: DecisionNoticeAction[];
}
