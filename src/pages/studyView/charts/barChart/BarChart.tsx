import * as React from "react";
import { observer } from "mobx-react";
import { VictoryChart, VictoryBar, VictoryAxis, VictorySelectionContainer } from 'victory';
import { computed } from "mobx";
import _ from "lodash";
import CBIOPORTAL_VICTORY_THEME from "shared/theme/cBioPoralTheme";
import {ClinicalDataIntervalFilterValue, DataBin} from "shared/api/generated/CBioPortalAPIInternal";
import { AbstractChart } from "pages/studyView/charts/ChartContainer";
import { bind } from "bind-decorator";
import BarChartAxisLabel from "./BarChartAxisLabel";
import {
    filterCategoryBins,
    filterNumericalBins,
    formatNumericalTickValues,
    generateCategoricalData,
    generateNumericalData
} from "../../StudyViewUtils";
import {STUDY_VIEW_CONFIG} from "../../StudyViewConfig";

export interface IBarChartProps {
    data: DataBin[];
    filters: ClinicalDataIntervalFilterValue[];
    onUserSelection: (dataBins: DataBin[]) => void;
}

export type BarDatum = {
    x: number,
    y: number,
    dataBin: DataBin
};

function generateTheme() {
    const theme = _.cloneDeep(CBIOPORTAL_VICTORY_THEME);
    theme.axis.style.tickLabels.fontSize *= 0.85;

    return theme;
}

const VICTORY_THEME = generateTheme();

@observer
export default class BarChart extends React.Component<IBarChartProps, {}> implements AbstractChart {

    private svgContainer: any;

    constructor(props: IBarChartProps) {
        super(props);
    }

    @bind
    private onSelection(bars: {data: BarDatum[]}[], bounds: {x: number, y: number}[], props: any) {
        const dataBins = _.flatten(bars.map(bar => bar.data.map(barDatum => barDatum.dataBin)));
        this.props.onUserSelection(dataBins);
    }

    private isDataBinSelected(dataBin: DataBin, filters: ClinicalDataIntervalFilterValue[]) {
        return filters.find(filter =>
            (filter.start === dataBin.start && filter.end === dataBin.end) ||
            (filter.value !== undefined && filter.value === dataBin.specialValue)
        ) !== undefined;
    }

    public toSVGDOMNode(): Element {
        return this.svgContainer.firstChild;
    }

    @computed get numericalBins() {
        return filterNumericalBins(this.props.data);
    }

    @computed get categoryBins() {
        return filterCategoryBins(this.props.data);
    }

    @computed get numericalData(): BarDatum[] {
        return generateNumericalData(this.numericalBins);
    }

    @computed get categoricalData(): BarDatum[] {
        return generateCategoricalData(this.categoryBins, this.numericalTickFormat.length);
    }

    @computed get numericalTickFormat() {
        const formatted = formatNumericalTickValues(this.numericalBins);

        // if the value contains ^ we need to return an array of values, instead of a single value
        // to be compatible with BarChartAxisLabel
        return formatted.map(value => value.includes("^") ? value.split("^") : value);
    }

    @computed get barData(): BarDatum[] {
        return [
            ...this.numericalData,
            ...this.categoricalData
        ];
    }

    @computed get categories() {
        return this.categoryBins.map(dataBin =>
            dataBin.specialValue === undefined ? `${dataBin.start}` : dataBin.specialValue);
    }

    @computed get tickValues() {
        const values: number[] = [];

        for (let i = 1; i <= this.numericalTickFormat.length + this.categories.length; i++) {
            values.push(i);
        }

        return values;
    }

    @computed get tickFormat() {
        // copy non-numerical categories as is
        return [
            ...this.numericalTickFormat,
            ...this.categories
        ];
    }

    public render() {

        return (
            <div>
                <VictoryChart
                    containerComponent={
                        <VictorySelectionContainer
                            containerRef={(ref: any) => this.svgContainer = ref}
                            selectionDimension="x"
                            onSelection={this.onSelection}
                        />
                    }
                    style={{
                        parent: {
                            width: 380, height: 180
                        }
                    }}
                    height={150}
                    padding={{left: 40, right: 20, top: 10, bottom: 20}}
                    theme={VICTORY_THEME}
                >
                    <VictoryAxis
                        tickValues={this.tickValues}
                        tickFormat={(t: number) => this.tickFormat[t - 1]}
                        domain={[0, this.tickValues[this.tickValues.length -1] + 1]}
                        tickLabelComponent={<BarChartAxisLabel />}
                        style={{tickLabels: {angle: this.tickValues.length > STUDY_VIEW_CONFIG.thresholds.escapeTick ? 315 : 0}}}
                    />
                    <VictoryAxis
                        dependentAxis={true}
                        tickFormat={(t: number) => Number.isInteger(t) ? t.toFixed(0) : ''}
                    />
                    <VictoryBar
                        style={{
                            data: {
                                fill: (d: BarDatum) =>
                                    this.isDataBinSelected(d.dataBin, this.props.filters) ? STUDY_VIEW_CONFIG.colors.theme.selectedGroup : STUDY_VIEW_CONFIG.colors.theme.unselectedGroup
                            }
                        }}
                        data={this.barData}
                    />
                </VictoryChart>
            </div>
        );
    }
}
