import { Toolbar } from "./views/toolbar.js";
import { HomePage } from "./pages/home-page.js";
import { SummaryPage } from "./pages/summary-page.js";
import { persistenceService } from "./services/persistence-service.js";
import { eventBus } from "./services/event-bus.js"


class App {
    constructor() {
        // Toolbar
        this._toolbar = new Toolbar('toolbar');

        // Create the pages
        this._homePage = new HomePage('home-page');
        this._summaryPage = new SummaryPage('summary-page');
    }

    async start() {
        await persistenceService.readOnStartup();
        eventBus.publish('show-page', 'home-page', this);
    }
}

const app = new App();
app.start();