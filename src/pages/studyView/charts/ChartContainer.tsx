import * as React from "react";
import styles from "./styles.module.scss";
import {observer} from "mobx-react";
import {action, computed, observable} from "mobx";
import _ from "lodash";
import {StudyViewComponentLoader} from "./StudyViewComponentLoader";
import {ChartControls, ChartHeader} from "pages/studyView/chartHeader/ChartHeader";
import {
    AnalysisGroup,
    ChartMeta,
    ChartType,
    ChartTypeEnum,
    ClinicalDataCountWithColor,
    StudyViewPageStore
} from "pages/studyView/StudyViewPageStore";
import {DataBin} from "shared/api/generated/CBioPortalAPIInternal";
import PieChart from "pages/studyView/charts/pieChart/PieChart";
import {svgToPdfPromise} from "shared/lib/svgToPdfDownload";
import classnames from "classnames";
import ClinicalTable from "pages/studyView/table/ClinicalTable";
import MobxPromise from "mobxpromise";
import SurvivalChart, {LegendLocation} from "../../resultsView/survival/SurvivalChart";
import {MutatedGenesTable} from "../table/MutatedGenesTable";
import {CNAGenesTable} from "../table/CNAGenesTable";
import StudyViewScatterPlot from "./scatterPlot/StudyViewScatterPlot";
import { bind } from "bind-decorator";
import BarChart from "./barChart/BarChart";
import {CopyNumberGeneFilterElement} from "../../../shared/api/generated/CBioPortalAPIInternal";
import {getTableHeightByDimension, getTableWidthByDimension, makeMutationCountVsCnaTooltip} from "../StudyViewUtils";
import {ClinicalAttribute} from "../../../shared/api/generated/CBioPortalAPI";
import {remoteData} from "../../../shared/api/remoteData";
import {makeSurvivalChartData} from "./survival/StudyViewSurvivalUtils";

export interface AbstractChart {
    toSVGDOMNode: () => Element;
}

export type ChartDownloadType = 'TSV' | 'SVG' | 'PDF';

export interface IChartContainerDownloadProps {
    type: ChartDownloadType;
    initDownload?: () => Promise<string>;
}

export interface IChartContainerProps {
    chartMeta: ChartMeta;
    title: string;
    promise: MobxPromise<any>;
    filters: any;
    onValueSelection?: any;
    onDataBinSelection?: any;
    download?: IChartContainerDownloadProps[];
    onResetSelection?: any;
    onDeleteChart: (chartMeta: ChartMeta) => void;
    onChangeChartType: (chartMeta: ChartMeta, newChartType: ChartType) => void;
    onToggleLogScale?:any;
    logScaleChecked?:boolean;
    showLogScaleToggle?:boolean;
    selectedGenes?:any;
    onGeneSelect?:any;
    selectedSamplesMap?: any;
    selectedSamples?: any;

    setAnalysisGroupsSettings: (attribute:ClinicalAttribute, grp:ReadonlyArray<AnalysisGroup>)=>void;
    analysisGroupsSettings:StudyViewPageStore["analysisGroupsSettings"];
    patientKeysWithNAInSelectedClinicalData?:MobxPromise<string[]>; // patients which have NA values for filtered clinical attributes
    analysisGroupsPossible?:boolean;
    patientToAnalysisGroup?:MobxPromise<{[uniquePatientKey:string]:string}>;
    sampleToAnalysisGroup?:MobxPromise<{[uniqueSampleKey:string]:string}>;
}

@observer
export class ChartContainer extends React.Component<IChartContainerProps, {}> {

    private handlers: any;
    private plot: AbstractChart;

    @observable mouseInChart: boolean = false;
    @observable placement: 'left' | 'right' = 'right';
    @observable chartType: ChartType;

    @observable naPatientsHiddenInSurvival = true; // only relevant for survival charts - whether cases with NA clinical value are shown

    constructor(props: IChartContainerProps) {
        super(props);

        this.chartType = this.props.chartMeta.chartType;

        this.handlers = {
            ref: (plot: AbstractChart) => {
                this.plot = plot;
            },
            resetFilters: action(() => {
                this.props.onResetSelection(this.props.chartMeta, []);
            }),
            onValueSelection: action((values: string[]) => {
                this.props.onValueSelection(this.props.chartMeta, values);
            }),
            onDataBinSelection: action((dataBins: DataBin[]) => {
                this.props.onDataBinSelection(this.props.chartMeta, dataBins);
            }),
            onToggleLogScale: action(() => {
                if (this.props.onToggleLogScale) {
                    this.props.onToggleLogScale(this.props.chartMeta);
                }
            }),
            updateCNAGeneFilters: action((filters: CopyNumberGeneFilterElement[]) => {
                this.props.onValueSelection(filters);
            }),
            updateGeneFilters: action((value: number[]) => {
                this.props.onValueSelection(value);
            }),
            onMouseEnterChart: action((event: React.MouseEvent<any>) => {
                this.placement = event.nativeEvent.x > 800 ? 'left' : 'right';
                this.mouseInChart = true;
            }),
            onMouseLeaveChart: action(() => {
                this.placement = 'right'
                this.mouseInChart = false;
            }),
            defaultDownload: {
                SVG: () => Promise.resolve((new XMLSerializer()).serializeToString(this.toSVGDOMNode())),
                PDF: () => svgToPdfPromise(this.toSVGDOMNode())
            },
            onChangeChartType: (newChartType: ChartType) => {
                this.mouseInChart = false;
                this.props.onChangeChartType(this.props.chartMeta, newChartType)
            },
            onDeleteChart: () => {
                this.props.onDeleteChart(this.props.chartMeta);
            }
        };
    }

    public toSVGDOMNode(): Element {
        if (this.plot) {
            // Get result of plot
            return this.plot.toSVGDOMNode();
        } else {
            return document.createElementNS("http://www.w3.org/2000/svg", "svg");
        }
    }

    @computed
    get chartWidth() {
        let chartWidth = styles.chartWidthTwo;
        if (this.chartType === ChartTypeEnum.PIE_CHART) {
            chartWidth = styles.chartWidthOne;
        }
        return chartWidth;
    }

    @computed
    get chartHeight() {
        let chartHeight = styles.chartHeightTwo;
        if (this.chartType === ChartTypeEnum.PIE_CHART ||
            this.chartType === ChartTypeEnum.BAR_CHART)
        {
            chartHeight = styles.chartHeightOne;
        }
        return chartHeight;
    }

    @computed
    get hideLabel() {
        return this.chartType === ChartTypeEnum.TABLE;
    }

    @computed
    get chartControls(): ChartControls {
        let controls:Partial<ChartControls> = {};
        switch (this.chartType) {
            case ChartTypeEnum.BAR_CHART: {
                controls = {
                    showLogScaleToggle: this.props.showLogScaleToggle,
                    logScaleChecked: this.props.logScaleChecked
                };
                break;
            }
            case ChartTypeEnum.PIE_CHART: {
                controls = {showTableIcon: true}
                break;
            }
            case ChartTypeEnum.TABLE: {
                if (!_.isEqual(this.props.chartMeta.chartType, ChartTypeEnum.TABLE)) {
                    controls = {showPieIcon: true}
                }
                break;
            }
        }
        if (this.analysisGroupsPossible) {
            controls.showAnalysisGroupsIcon = true;
        }
        return {
            ...controls,
            showResetIcon: this.props.filters && this.props.filters.length > 0
        } as ChartControls;
    }

    @bind
    @action
    changeChartType(chartType: ChartType) {
        this.chartType = chartType;
        this.handlers.onChangeChartType(chartType);
    }


    @computed
    get analysisGroupsPossible() {
        return !!this.props.analysisGroupsPossible &&
            (this.chartType === ChartTypeEnum.PIE_CHART || this.chartType === ChartTypeEnum.TABLE) &&
            !!this.props.chartMeta.clinicalAttribute;
    }

    @bind
    @action
    setAnalysisGroups() {
        if (this.analysisGroupsPossible) {
            this.props.setAnalysisGroupsSettings(this.props.chartMeta.clinicalAttribute!, this.props.promise.result as ClinicalDataCountWithColor[]);
        }
    }

    @bind
    @action
    toggleSurvivalHideNAPatients() {
        this.naPatientsHiddenInSurvival = !this.naPatientsHiddenInSurvival;
    }

    @computed get survivalChartData() {
        // need to put this in @computed instead of a remoteData, because in a remoteData any changes to props trigger
        //   a rerender with delay
        if (this.props.promise.isComplete && this.props.patientToAnalysisGroup && this.props.patientToAnalysisGroup.isComplete &&
            (!this.props.patientKeysWithNAInSelectedClinicalData || this.props.patientKeysWithNAInSelectedClinicalData.isComplete)) {
            const survivalData = _.find(this.props.promise.result!, (survivalPlot) => {
                return survivalPlot.id === this.props.chartMeta.uniqueKey;
            });
            return makeSurvivalChartData(
                survivalData.alteredGroup.concat(survivalData.unalteredGroup),
                this.props.analysisGroupsSettings.groups,
                this.props.patientToAnalysisGroup!.result!,
                this.naPatientsHiddenInSurvival,
                this.props.patientKeysWithNAInSelectedClinicalData && this.props.patientKeysWithNAInSelectedClinicalData.result!,
            );
        } else {
            return undefined;
        }
    };

    @computed
    get chart() {
        switch (this.chartType) {
            case ChartTypeEnum.PIE_CHART: {
                return (<PieChart
                    ref={this.handlers.ref}
                    onUserSelection={this.handlers.onValueSelection}
                    filters={this.props.filters}
                    data={this.props.promise.result}
                    active={this.mouseInChart}
                    placement={this.placement}
                    label={this.props.title}
                />);
            }
            case ChartTypeEnum.BAR_CHART: {
                return (
                    <BarChart
                        ref={this.handlers.ref}
                        onUserSelection={this.handlers.onDataBinSelection}
                        filters={this.props.filters}
                        data={this.props.promise.result}
                    />
                );
            }
            case ChartTypeEnum.TABLE: {
                return (<ClinicalTable
                    data={this.props.promise.result}
                    width={getTableWidthByDimension(this.props.chartMeta.dimension)}
                    height={getTableHeightByDimension(this.props.chartMeta.dimension)}
                    filters={this.props.filters}
                    onUserSelection={this.handlers.onValueSelection}
                    label={this.props.title}
                />);
            }
            case ChartTypeEnum.MUTATED_GENES_TABLE: {
                return (
                    <MutatedGenesTable
                        promise={this.props.promise}
                        width={getTableWidthByDimension(this.props.chartMeta.dimension)}
                        height={getTableHeightByDimension(this.props.chartMeta.dimension)}
                        numOfSelectedSamples={100}
                        filters={this.props.filters}
                        onUserSelection={this.handlers.updateGeneFilters}
                        onGeneSelect={this.props.onGeneSelect}
                        selectedGenes={this.props.selectedGenes}
                    />
                );
            }
            case ChartTypeEnum.CNA_GENES_TABLE: {
                return (
                    <CNAGenesTable
                        promise={this.props.promise}
                        width={getTableWidthByDimension(this.props.chartMeta.dimension)}
                        height={getTableHeightByDimension(this.props.chartMeta.dimension)}
                        numOfSelectedSamples={100}
                        filters={this.props.filters}
                        onUserSelection={this.handlers.updateCNAGeneFilters}
                        onGeneSelect={this.props.onGeneSelect}
                        selectedGenes={this.props.selectedGenes}
                    />
                );
            }
            case ChartTypeEnum.SURVIVAL: {
                if (this.survivalChartData) {
                    return (
                        <SurvivalChart ref={this.handlers.ref}
                                       patientSurvivals={this.survivalChartData.patientSurvivals}
                                       patientToAnalysisGroup={this.survivalChartData.patientToAnalysisGroup}
                                       analysisGroups={this.survivalChartData.analysisGroups}
                                       analysisClinicalAttribute={this.props.analysisGroupsSettings.clinicalAttribute}
                                       naPatientsHiddenInSurvival={this.naPatientsHiddenInSurvival}
                                       toggleSurvivalHideNAPatients={this.toggleSurvivalHideNAPatients}
                                       legendLocation={LegendLocation.TOOLTIP}
                                       title={this.props.title}
                                       xAxisLabel="Months Survival"
                                       yAxisLabel="Surviving"
                                       totalCasesHeader="Number of Cases, Total"
                                       statusCasesHeader="Number of Cases, Deceased"
                                       medianMonthsHeader="Median Months Survival"
                                       yLabelTooltip="Survival estimate"
                                       xLabelWithEventTooltip="Time of death"
                                       xLabelWithoutEventTooltip="Time of last observation"
                                       showDownloadButtons={false}
                                       showTable={false}
                                       styleOpts={{
                                           width: 400,
                                           height: 380,
                                           legend: {
                                               x: 190,
                                               y: 12
                                           },
                                           axis: {
                                               y: {
                                                   axisLabel: {
                                                       padding: 40
                                                   }
                                               }
                                           }
                                       }}
                                       fileName="Overall_Survival"
                        />
                    );
                } else {
                    return null;
                }
            }
            case ChartTypeEnum.SCATTER: {
                // sampleToAnalysisGroup is complete because of loadingPromises and StudyViewComponentLoader
                return (
                    <StudyViewScatterPlot
                        ref={this.handlers.ref}
                        width={400}
                        height={380}
                        onSelection={this.props.onValueSelection}
                        data={this.props.promise.result}
                        isLoading={this.props.selectedSamples.isPending}

                        sampleToAnalysisGroup={this.props.sampleToAnalysisGroup!.result!}
                        analysisGroups={this.props.analysisGroupsSettings.groups}
                        analysisClinicalAttribute={this.props.analysisGroupsSettings.clinicalAttribute}

                        axisLabelX="Fraction of copy number altered genome"
                        axisLabelY="# of mutations"
                        tooltip={this.mutationCountVsCnaTooltip}
                    />
                );
            }
            default:
                return null;
        }
    }

    @computed get mutationCountVsCnaTooltip() {
        return makeMutationCountVsCnaTooltip(this.props.sampleToAnalysisGroup!.result, this.props.analysisGroupsSettings.clinicalAttribute);
    }

    @computed get loadingPromises() {
        const ret = [this.props.promise];
        switch (this.chartType) {
            case ChartTypeEnum.SCATTER:
                ret.push(this.props.sampleToAnalysisGroup!);
                break;
        }
        return ret;
    }

    @computed get isAnalysisTarget() {
        return this.props.analysisGroupsSettings.clinicalAttribute &&
                this.props.chartMeta.clinicalAttribute &&
            (this.props.analysisGroupsSettings.clinicalAttribute.clinicalAttributeId === this.props.chartMeta.clinicalAttribute.clinicalAttributeId);
    }

    public render() {
        return (
            <div className={classnames(styles.chart, { [styles.analysisTarget]:this.isAnalysisTarget })}
                 onMouseEnter={this.handlers.onMouseEnterChart}
                 onMouseLeave={this.handlers.onMouseLeaveChart}>
                <ChartHeader
                    chartMeta={this.props.chartMeta}
                    title={this.props.title}
                    active={this.mouseInChart}
                    resetChart={this.handlers.resetFilters}
                    deleteChart={this.handlers.onDeleteChart}
                    toggleLogScale={this.handlers.onToggleLogScale}
                    hideLabel={this.hideLabel}
                    chartControls={this.chartControls}
                    changeChartType={this.changeChartType}
                    download={this.generateHeaderDownloadProps(this.props.download)}
                    setAnalysisGroups={this.setAnalysisGroups}
                />
                <StudyViewComponentLoader promises={this.loadingPromises}>
                    {this.chart}
                </StudyViewComponentLoader>
            </div>
        );
    }

    private generateHeaderDownloadProps(download?: IChartContainerDownloadProps[]): IChartContainerDownloadProps[] {
        return download && download.length > 0 ? download.map(props => ({
                type: props.type,
                initDownload: props.initDownload ? props.initDownload : this.handlers.defaultDownload[props.type]
            })
        ) : [];
    }
}
