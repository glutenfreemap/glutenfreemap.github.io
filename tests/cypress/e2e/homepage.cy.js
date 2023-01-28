Cypress.on("window:before:load", (win) => {
    delete win.navigator.__proto__.serviceWorker
});

const languages = [
    {
        languages: ["pt-PT"],
        expected: "pt"
    },
    {
        languages: ["en-GB"],
        expected: "en"
    },
    {
        languages: ["es-ES"],
        expected: "es"
    },
    {
        languages: ["fr-FR"],
        expected: "fr"
    },
    {
        languages: ["el-GR", "pt-PR"],
        expected: "pt"
    },
    {
        languages: ["fr-FR", "pt-PT"],
        expected: "fr"
    }
];

for (const lang of languages) {
    describe("Homepage redirects to the user's preferred language", () => {
        it(`Redirects to ${lang.expected} when languages are ${lang.languages.join(", ")}`, () => {
            cy.visit("/", {
                onBeforeLoad(win) {
                    Object.defineProperty(win.navigator, "languages", { value: lang.languages });
                }
            });
            cy.url().should("include", `/${lang.expected}/`);
        });
    });
}

describe("Homepage does not redirect to unsupported languages", () => {
    it("Doesn't redirect", () => {
        cy.visit("/", {
            onBeforeLoad(win) {
                Object.defineProperty(win.navigator, "languages", { value: ["el-GR"] });
            }
        });
        cy.url().should("not.match", /\/\w+\//);
    });
});
