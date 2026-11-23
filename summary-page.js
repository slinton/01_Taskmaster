import { PasswordView } from './views/password-view.js';

class SummaryPage {
    constructor() {
        this.passwordView = new PasswordView();
        this.passwordView.render();
    }
}

const app = new SummaryPage();