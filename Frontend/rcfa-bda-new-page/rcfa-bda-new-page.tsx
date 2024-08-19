import * as React from 'react';
import {observer} from "mobx-react";
import RcfaBdaNewPageLogic from "./rcfa-bda-new-page-logic";
import * as styles from './rcfa-bda-new-page.scss';
import { observable, computed } from '../../../../node_modules/mobx';
import BoomFiltersState from "../../../models/boom-filters-state";
import DescriptionPage from './bda-description-page/bda-description-page';
import RestoringPage from './bda-restoring-page/bda-restoring-page';
import AnalyticPage from './bda-analytics-page/bda-analytics-page';
import CountermeasurePage from './bda-countermeasure-page/bda-countermeasure-page';
import MonitoringPage from "./bda-monitoring-page/bda-monitoring-page";
import ErradicationPage from "./bda-erradication-page/bda-erradication-page";
import PixieImageEditorWidget from 'ClientApp/components/common/pixie-image-editor-widget/pixie-image-editor-widget';

interface RcfaDasNewPageProps {
    boomFiltersState:BoomFiltersState;
    id?:number|null;
}

interface RcfaDasNewPageState {
    
}

@observer
export default class RcfaBdaNewPage extends React.Component<RcfaDasNewPageProps, RcfaDasNewPageState> {

    @observable
    private logic: RcfaBdaNewPageLogic;
    private editor:any;
    public form: HTMLFormElement | null = null;

    public get getEditor(){ return this.editor as PixieImageEditorWidget; }

    constructor(props: any) {
        super(props);
        this.logic = new RcfaBdaNewPageLogic(props.id, this);
    }

    @computed
    private get canRenderAnalysis() {
        let data = this.logic.rcfaBdaClientForm;
        return data != null && data.CurrentBdaStateId != null && data.CurrentBdaStateId >= 3
    }

    componentDidMount() {
        this.logic.onComponentDidMount();
    }

    private renderBody = () =>{
        return (
            <div className="row" style={{padding: "0 10px 0 10px"}}>
                <DescriptionPage ref={descPage=> this.logic.descriptionPage = descPage}
                    boomFilters={this.props.boomFiltersState}     
                                 rcfaBdaClientForm={this.logic.rcfaBdaClientForm}/>
                {
                    this.logic.rcfaBdaClientForm.Id && 
                    this.logic.rcfaBdaClientForm.CurrentBdaStateId && 
                    this.logic.rcfaBdaClientForm.CurrentBdaStateId > 1?
                        <RestoringPage ref={restPage=> this.logic.restoringPage = restPage}
                                       rcfaBdaClientForm={this.logic.rcfaBdaClientForm}/>
                    : 
                        null
                }
                
                {
                    this.canRenderAnalysis?
                        <AnalyticPage ref={analPage=> this.logic.analyticPage = analPage}
                                      rcfaBdaClientForm={this.logic.rcfaBdaClientForm} />
                    : 
                        null
                }
                {
                    
                    this.logic.rcfaBdaClientForm.Id && this.logic.rcfaBdaClientForm.FiveWhyAnalysisId && this.logic.rcfaBdaClientForm.CurrentBdaStateId && this.logic.rcfaBdaClientForm.CurrentBdaStateId > 3?
                        <CountermeasurePage ref={counterPage=> this.logic.countermeasurePage = counterPage}
                                            FiveWhyAnalysisId={this.logic.rcfaBdaClientForm.FiveWhyAnalysisId}
                                            rcfaBdaClientForm={this.logic.rcfaBdaClientForm}/>
                    : 
                        null
                }
                {
                    this.logic.rcfaBdaClientForm && this.logic.rcfaBdaClientForm.Id?
                        <MonitoringPage ref={monitoringPage=> this.logic.monitoringPage = monitoringPage}
                                        rcfaBdaClientForm={this.logic.rcfaBdaClientForm}
                                        rcfaBdaId={this.logic.id?this.logic.id:void 0}/>
                    : 
                        null
                }
                {
                    this.logic.rcfaBdaClientForm && this.logic.rcfaBdaClientForm.Id ?
                        <ErradicationPage ref={standarsPage=> this.logic.standarsPage = standarsPage}
                                          rcfaBdaClientForm={this.logic.rcfaBdaClientForm}/>
                    : 
                        null
                }
            </div>
        )
    }
    getIdBda() {
        return (
            <span>{}</span>
            )
    }
    render() {
        let canTofinish:boolean = this.logic.rcfaBdaClientForm ? this.logic.rcfaBdaClientForm.CanGoToNextState ? !this.logic.rcfaBdaClientForm.CanGoToNextState : true : true;
        const allCountermeasureValidated = this.logic.AllCountermeasureValidated
        const disableButton = (canTofinish == false && allCountermeasureValidated == true) ? false : true;
        let data = this.logic.rcfaBdaClientForm;
        
        return (
            <div className={"row"}>
                <div className="breadcrumbs">
                    <ul>
                        <li><a href="/rcfa">Sistema de RCFA</a><span /></li>
                        <li>BDA</li>
                    </ul>
                </div>
                <div className="row" style={{margin: 0}}>
                    <a href="/rcfa/bda/" className={`${styles.btnBack} wave wave-light btn-flat`}><i className="fas fa-chevron-left"></i> Regresar</a>
                </div>
                <div className={`${styles.formBody}`}>
                    <form noValidate={true} ref={(el) => { this.form = el; }}>
                        <div className={`row ${styles.titleRow}`}>
                            <div className={`col s12 ${styles.formHead}`}>
                                <h5>{this.logic.rcfaBdaClientForm.isEdit ? `BDA #${this.logic.rcfaBdaClientForm.Id}` : 'Nuevo BDA'} - {this.logic.currentName}</h5>
                            </div>
                        </div>
                        <div className={`row `}>
                            <div className="col s12">
                                <ul className={`tabs ${styles.customIndicator}`}>
                                    <li className={`tab col s2 ${styles.customTab} `}>
                                        <a id={"bdaDescriptionAnchoreTag"} onClick={this.logic.HandlerClickTabDescription} href="#bdaDescriptionContent" className={data.CurrentBdaStateId != null && data.CurrentBdaStateId == 1 ? 'active':''} >Descripción</a>
                                    </li>
                                    <li className={`tab col s2 ${styles.customTab} ${data.CurrentBdaStateId != null && data.CurrentBdaStateId >= 2 ? '': 'disabled'}`}>
                                        <a id={"bdaRestoringAnchoreTag"} onClick={this.logic.HandlerClickTabRestoring} href="#bdarestoring" className={data.CurrentBdaStateId != null && data.CurrentBdaStateId == 2 ? 'active':''}>Restauración</a>
                                    </li>
                                    <li className={`tab col s2 ${styles.customTab} ${data.CurrentBdaStateId != null && data.CurrentBdaStateId >= 3 ?'' : 'disabled'}`}>
                                        <a id={"bdaAnalyticsAnchoreTag"} onClick={this.logic.HandlerClickTabAnalytics} href="#bdaanalytics" className={data.CurrentBdaStateId != null && data.CurrentBdaStateId == 3 ? 'active':''}>Análisis</a>
                                    </li>
                                    <li className={`tab col s2 ${styles.customTab} ${data.CurrentBdaStateId != null && data.CurrentBdaStateId >= 4 ? '' : 'disabled'}`}>
                                        <a id={"bdaCountermeasureAnchoreTag"} onClick={this.logic.HandlerClickTabCountermeasure} href="#bdacountermeasure" className={data.CurrentBdaStateId != null && data.CurrentBdaStateId == 4 ? 'active':''}>Contramedidas</a>
                                    </li>
                                    <li className={`tab col s2 ${styles.customTab} ${data.CurrentBdaStateId != null && data.CurrentBdaStateId >= 5 ? '' : 'disabled'}`}>
                                        <a id={"bdaMonitoringAnchoreTag"} onClick={this.logic.HandlerClickTabMonitoring} href="#bdamonitoring" className={data.CurrentBdaStateId != null && data.CurrentBdaStateId == 5 ? 'active':''}>Seguimiento</a>
                                    </li>
                                    <li className={`tab col s2 ${styles.customTab} ${data.CurrentBdaStateId != null && data.CurrentBdaStateId >= 6 ? '' : 'disabled'}`}>
                                        <a id={"bdaStandardsAnchoreTag"} onClick={this.logic.HandlerClickTabStandars} href="#bdastandards" className={data.CurrentBdaStateId != null && data.CurrentBdaStateId == 6 ? 'active':''}>Estandarización</a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        {this.renderBody()}
                    </form>
                    <div className="row">
                        <div className="col s6 m6 l6">
                            <a href="/rcfa/bda/" className={`wave wave-light btn ${styles.btnCancel}`} style={{float:"right"}}>Cancelar</a>
                        </div>
                        <div className="col s6 m6 l6">
                            <div className="row">
                                <div className="col s12 m6 l6">                                
                                    {this.logic.rcfaBdaClientForm.CurrentBdaStateId != 4 ?
                                        <button id="btnFinishDas" type="button" disabled={canTofinish} className={`wave wave-light btn ${styles.btnSave}`} style={{ float: "left" }} onClick={(event) => this.logic.finishConfirm(event)}>Finalizar</button>
                                        : <button id="btnFinishDas" type="button" disabled={disableButton} className={`wave wave-light btn ${styles.btnSave}`} style={{ float: "left" }} onClick={(event) => this.logic.finishConfirm(event)}>Finalizar</button>
                                    }
                                </div>
                                <div className="col s12 m6 l6">
                                    <a id="btnSaveDas" className={`wave wave-light btn ${styles.btnSave}`} style={{ float: "right", visibility: this.logic.rcfaBdaClientForm.CurrentBdaStateId == 8 ? "hidden": "visible"}} onClick={(event)=>this.logic.save(event)}>Guardar</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}