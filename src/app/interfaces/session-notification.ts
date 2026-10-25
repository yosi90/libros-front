import { AppToastAction, AppToastType } from '../shared/toast/app-toast';

export type DecisionActionAppearance = 'primary' | 'secondary' | 'danger';

export interface DecisionNoticeAction extends AppToastAction {
    id: string;
    appearance: DecisionActionAppearance;
    closeOnSelect?: boolean;
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
