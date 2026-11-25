import { HomePage } from "./pages/home-page.js";
import { SummaryPage } from "./pages/summary-page.js";
import { persistenceService } from "./services/persistence-service.js";


class App {
    constructor() {

        // Create the pages
        this._homePage = new HomePage('home-page');
        this._summaryPage = new SummaryPage('summary-page');
    }

    async start() {
        await persistenceService.readOnStartup();
    }
}

const app = new App();
app.start();