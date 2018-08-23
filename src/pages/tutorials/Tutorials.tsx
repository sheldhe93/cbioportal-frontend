import * as React from 'react';
import {observer} from 'mobx-react';
import {PageLayout} from "../../shared/components/PageLayout/PageLayout";
import './styles.scss';

@observer
export default class Tutorials extends React.Component<{}, {}> {

    public render() {

        return <PageLayout className={'whiteBackground'}>

            <h1>Tutorials</h1>

            <h2>Step-by-step Guide to cBioPortal: a Protocol Paper</h2>
            <p>Gao, Aksoy, Dogrusoz, Dresdner, Gross, Sumer, Sun, Jacobsen, Sinha, Larsson, Cerami, Sander,
                Schultz. <br/>
                <b>Integrative analysis of complex cancer genomics and clinical profiles using the cBioPortal.</b> <br/>
                <i>Sci. Signal.</i> 6, pl1 (2013).
                [<a href="http://www.ncbi.nlm.nih.gov/pubmed/23550210">Reprint</a>].</p>

            <hr/>

            <h2>Tutorial #1: Single Study Exploration</h2>
            <iframe src="https://docs.google.com/presentation/d/1_OGK69lO4Z62WaxHHkNYmWvY0LQN2v0slfaLyY1_IQ0/embed?start=false&loop=false&delayms=60000"
                frameBorder="0" width="720" height="434" allowFullScreen={true}></iframe>
            <hr/>
            <p></p>
            <h2>Tutorial #2: Single Study Query</h2>
            <iframe
                src="https://docs.google.com/presentation/d/1y9UTIr5vHmsNVWqtGTVGgiuYX9wkK_a_RPNYiR8kYD8/embed?start=false&loop=false&delayms=60000"
                frameBorder="0" width="720" height="434" allowFullScreen={true}></iframe>
            <hr/>
            <p></p>
            <h2>Tutorial #3: Patient View</h2>
            <iframe src="https://docs.google.com/presentation/d/1Jr_2yEfgjKBn4DBiXRk4kmhIbtsRp6gd0iD3k1fIUUk/embed?start=false&loop=false&delayms=60000"
                frameBorder="0" width="720" height="434" allowFullScreen={true}></iframe>


        </PageLayout>

    }

}




