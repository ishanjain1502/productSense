you come to the product

enter demo mode:

    set up one of the demos
    step 1: skip for now ( a custom hook gets prepared, which goes to your agent, ask it to do this feature regression test, and sends back report to backend, save it for the user for the project, you will write a prompt, which when used by agent, tests for regression and blast radius on the project with respect to change on entire, and sends that information to our backend, for identifying it is related to which user send it on some parameter related to userID)
    step 2: Market Analysis
        a: crustdata — implemented as Step 3 UI (`/demo|full/market-analysis`); see `docs/superpowers/specs/2026-10-12-market-analysis-step1-design.md`
        b: deploy a fleet of n agents, with randomly generated personas on the basis of user persona fed before to the system, 

        when you are done with market analysis step 1 crustdata
        you will get next button at the bottom of it
        clicking on it will take you to next step of market analysis

        lets move to next step of Market analysis
        that is generating a fleet of models with randomly generated personas, which will test out the feature request

        so on frontend, 
        give a slider with minimum 10 and max 1000, possible customers

        and we will start in following way
        lets say n(slider value) was selected to be 20

        first of all create questions for market research with regards to feature and product, 5 questions, and answer to each question is possible by giving a value from 0 to 100

        so now first we need to create n random personas on the basis of initial personas that we have
        keep the ratio consistent as it is in the inital form

        once that is done, show on frontend, that persona calculation done

        post that start spinning multiple subagents using commandcode, and give each one of them a persona that we prepared earlier, assign each agent with a unique key
        and ask them to answer questions related to market research and give answer to each question as
        {
        key1: value 1,
        key2:value2,
        key3:value3,
        .
        .
        verdict: string
        } 

        this information will be stored in databse in table agents

        agentRuns
        featureId: FK from features table
        userId: FK from users table
        projectId: FK from project table
        agentRunId: incrimentalId
        agentId: agentKey
        value: {
        key1: value 1,
        key2:value2,
        key3:value3,
        .
        .
        verdict: string
        } 

        once done we will show on frontend that insights have been gatherer
        this process will be done in batches of 5 subagents at once, and as the progress takes place here, we will have to update that on frontend as well in terms of percent, using batch wise progress

initial product context (before agent prompt / validation pipeline):
    steps: Product → Feature → Market → GTM → Financials
    Financials (after GTM, before starting downstream steps):
        feature investment: threshold (USD), build duration (weeks), expected resource consumption
        company financial health: profitability details (margins, burn, path to profit), runway remaining (months)
    all financial fields live on `projects`: financial_threshold_amount, expected_duration_weeks, expected_resource_consumption, profitability_details, runway_remaining_months; demo cards also use `demo_id` on projects
    seed: from `server/`, run `npm run seed:demo` — creates demo user (DEMO_USER_EMAIL / DEMO_USER_PASSWORD) and projects `demo-project-{ledgerlite|flowstack|nimbus}` with features `demo-feature-*`, all owned by that user