import * as React from 'react';
import ErradicationPageLogic from "./bda-erradication-page-logic";
import * as styles from './bda-erradication-page.scss';
import { RcfaBdaClientForm } from '../../../../models/rcfa-bda-form';
import CountermeasureEvidence from '../../../../models/countermeasure-evidence';
import { observer } from 'mobx-react';
import FiveWhyNode from '../../../../models/five-why-node';

interface ErradicationPageProps {
    rcfaBdaClientForm:RcfaBdaClientForm;
}
@observer
export default class BdaErradicationPage extends React.Component<ErradicationPageProps> {

    public logic: ErradicationPageLogic;

    constructor(props: any) {
        super(props);
        this.logic = new ErradicationPageLogic(this.props.rcfaBdaClientForm);
    }

    componentDidMount() {
        if (!this.logic.rcfaBdaClientForm.FiveWhyAnalysisId){

        }
        let dasId = this.props.rcfaBdaClientForm.FiveWhyAnalysisId != null?this.props.rcfaBdaClientForm.FiveWhyAnalysisId: void 0;
        this.logic.onComponentDidMount(dasId);
    }

    private showEvidence = (evidencesCard:Array<CountermeasureEvidence>) =>{
        let evidences:any = [];
            evidencesCard.map((evidence,i)=>
                evidences.push(
                    <div key={"evidence-card-"+i}className="col s6  m6 l6" style={{padding: "0px 20px 12px 20px"}}>
                        <a href="" className="wave wave-light btn">
                            <i className={evidence.EvidenceTypeId == 1?"far fa-image":"far fa-file-alt"}></i>
                            {evidence.OriginalFileName}
                        </a>
                    </div>
                )
            )
        return evidences;
    }

    private renderCards = () =>{
        let cards:any = [];
        this.logic.countermeasureList.map((counter,i)=>
            cards.push(
            <div key={"erradication-card-"+i} className={`col s12 m4 l3 ${styles.counterCard}`} onClick={()=>this.logic.openModal(counter)}>
                <div className={styles.counterHead}>
                    <h6>Contramedida:</h6>
                    <p>{counter.CountermeassureDescription}</p>
                </div>
                <div className={styles.counterBody}>
                    <h6>Estándares:</h6>
                    <div className="row" style={{marginBottom:0}}>
                    {
                        counter.Evidences.length > 0?
                            this.showEvidence(counter.Evidences)
                            :<p style={{padding: "15px"}}>No se cargaron archivos</p>
                    }
                    </div>
                </div>
            </div>
            )
        );

        return cards;
    }

    private evidenceBtn = (evidence:any)=>{
        return (
            <button 
                key={`btn-evidence-${evidence.EvidenceId}-${evidence.BlobId}`}
                className={`wave wave-light btn btn-flat ${styles.imgBtn}`}>

                <i className={evidence.EvidenceTypeId == 1 ? "far fa-image":"far fa-file-alt"} style={{marginRight:5}}></i>
                {evidence.OriginalFileName}
            </button>
        )
    }

    private setValueRoots = (root:Array<FiveWhyNode>) =>{
        let response = "";
        if(root.length > 0){
            root.forEach((cause,i)=>{
                if(i == (root.length-1))
                    response += cause.Id+"";
                else
                    response += cause.Id+", ";
            });
        }else{
            response = 'Sin causa raiz';
        }
        return response;
    }

    private modalCountermeasure = () => {
        return (
            <div id="modalErradication" className={`modalErradication modal ${styles.modalMain}`}>
                <h6>Contramedida</h6>
                <div className="modal-content" style={{paddingBottom:0}}>
                    <button type={"button"} className={`waves-effect waves-green btn-flat ${styles.customBtn}`} onClick={this.logic.closeModal}><i className="fas fa-times"></i></button>
                    <div className="row">
                        <div className="input-field col s12 m6 l6">
                                <input placeholder="Placeholder" id="causes" value={this.setValueRoots(this.logic.currentCountermeasure.RootCausesNodeIds)} type="text" disabled />
                                <label className="active" htmlFor="causes">Causas raiz</label>
                            </div>
                            <div className="input-field col s12 m6 l6">
                                <input placeholder="Placeholder" id="ResponsibleEmployee" value={this.logic.currentCountermeasure.ResponsibleEmployeeName.toString()} type="text" disabled />
                                <label className="active" htmlFor="ResponsibleEmployee">Responsable</label>
                            </div>
                        </div>
                        <div className="row" style={{marginBottom:0}}>
                            <div className="input-field col s12 m12 l12">
                                <textarea className="materialize-textarea" value={this.logic.currentCountermeasure.CountermeassureDescription} disabled></textarea>
                                <label className="active" htmlFor="countermeasure">Contramedida</label>
                            </div>
                        </div>
                        {
                            this.logic.currentCountermeasure.Evidences.length > 0?
                            <div className="row">
                                    <div className="col s12 m12 l12">
                                    {
                                        this.logic.currentCountermeasure.Evidences.length > 0?
                                        this.logic.currentCountermeasure.Evidences.map((evidence:any,i:number)=>
                                            this.evidenceBtn(evidence)
                                        ):<p>No se cargaron archivos</p>
                                    }
                                    </div>
                            </div>
                            :null
                        }
                </div>
            </div>
        );
    }
    
    render() {
        return (
            <div id="bdastandards" className={"col s12 tabAnyBda"} style={{display: "none"}}>
                <div className="row">
                    {
                        this.logic.isLoading ?
                            <div className="col s12 m12 l12">
                                <div className="progress">
                                    <div className="indeterminate"></div>
                                </div>
                            </div>
                        :
                            this.logic.countermeasureList && this.logic.countermeasureList.length > 0 ?
                                this.renderCards()
                            :
                                <div className="col s12 m12 l12" style={{textAlign:"center"}}>
                                    No se han registrado contramedidas
                                </div>
                    }
                </div>
                {this.modalCountermeasure()}
            </div>
        );
    }
}