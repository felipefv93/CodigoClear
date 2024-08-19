import * as React from 'react';
import CountermeasurePageLogic from "./bda-countermeasure-page-logic";
import * as styles from './bda-countermeasure-page.scss';
import FiveWhyFourM from 'ClientApp/models/five-why-four-m';
import Xelect from "../../../../lib/components/xelect/xelect";
import FileUpload from "../../../common/file-upload/file-upload";
import { observer } from 'mobx-react';
import FiveWhyNode from "../../../../models/five-why-node";
import CountermeasureType from "../../../../models/countermeasure-type";
import CountermeasureTypeDetail from "../../../../models/countermeasure-type-detail";
import FiveWhyCountmeassure from "../../../../models/five-why-countermeassure";
import * as moment from "moment";
import * as style from './bda-countermeasure-page.scss'
import { RcfaBdaClientForm } from '../../../../models/rcfa-bda-form';
import CountermeasureEvidence from '../../../../models/countermeasure-evidence';

interface CountermeasurePageProps {
    rcfaBdaClientForm:RcfaBdaClientForm,
    FiveWhyAnalysisId:number
}

interface IState {
    active: boolean,
    checkCard: boolean,
    cardExist: boolean
}
@observer
export default class BdaCountermeasurePage extends React.Component<CountermeasurePageProps, IState> {

    public logic: CountermeasurePageLogic;

    constructor(props: any) {
        super(props);
        this.logic = new CountermeasurePageLogic(this.props.rcfaBdaClientForm,
                                                 this.props.FiveWhyAnalysisId, 
            this);
        this.state = {
            active: false,
            checkCard: false,
            cardExist: false
        }
    }

    componentDidMount() {
        this.logic.onComponentDidMount();
    }


    editBda() {
        if (this.state.active) {
            this.setState({ active: false });
            this.logic.rcfaBdaClientForm.EditStageId = 4;
        } else {
            this.setState({ active: true });
            this.logic.rcfaBdaClientForm.EditStageId = undefined;
        }
    }
    private get editButton() {

        return (
            <div className="row">
                <div className="col s12 m6 l6">
                    <a id="btnEdit" className={`wave wave-light btn btnSave`} style={{ float: "left" }} onClick={(event) => this.editBda()}>Editar</a>
                </div>
            </div>

        );
    }
    private get cancelEditButton() {

        return (
            <div className="row">
                <div className="col s12 m6 l6">
                    <a id="btnCancelEdit" className={`wave wave-light btn btnCancel`} style={{ float: "left" }} onClick={(event) => this.editBda()}>Cancelar edición</a>
                </div>
            </div>

        );
    }
    async handleFormSubmit(changeState:boolean){
        this.logic.rcfaBdaClientForm = await this.logic.handleFormSubmit(changeState);
        return this.logic.rcfaBdaClientForm;
    }

    private errorFor(field: string, customMessage?: string) {
        if (!this.logic.modelStateErrors) return null;
        const message = this.logic.validationMessageFor(field);
        if (!message || !message.length) return null;
        return (
            <div className={style.errorInline}>{customMessage ? customMessage : message}</div>
        );
    }

    private modalCountermeasure = (active:boolean) => {
        let activeSave = !active && !this.logic.fiveWhyCountmeassure.Verified;
        let closeModal = this.logic.isFillOldData;
        let listNumber: Array<number> = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60];
        return (
            <div id="modalCountermeasure" className={`modalCountermeasure modal ${styles.modalMain}`}>
                <h6>{this.logic.modalTitle}</h6>
                <div className="modal-content" style={{paddingBottom:0}}>
                    <button type={"button"} className={`waves-effect waves-green btn-flat ${styles.customBtn}`} onClick={(e)=>this.logic.closeModal(e, activeSave ? true:false)}>
                        { 
                            closeModal ?
                                <i className="fa fa-spinner fa-pulse fa-3x fa-fw"></i>
                            :
                                <i className="fas fa-times"></i>
                        }
                    </button>
                    <div className="row">
                        <div className="col s12 m6">
                            <br />
                            <p className="radios">
                                <label>
                                    <input name="CountermeassureTypeId" value={CountermeasureType.Preventive} type="radio"
                                        checked={this.logic.countermeassureTypeId == CountermeasureType.Preventive}
                                        onChange={this.logic.onCountermeassureTypeChange}
                                        disabled={!activeSave}
                                    />
                                    <span>Preventiva</span>
                                </label>
                                <label>
                                    <input name="CountermeassureTypeId" value={CountermeasureType.Corrective} type="radio"
                                        checked={this.logic.countermeassureTypeId == CountermeasureType.Corrective}
                                        onChange={this.logic.onCountermeassureTypeChange}
                                        disabled={!activeSave}
                                    />
                                    <span>Correctiva</span>
                                </label>
                            </p>
                        </div>
                        {
                            this.logic.countermeassureTypeId == CountermeasureType.Preventive ?
                                <div className="input-field col s12 m2 l2">
                                    <div className={style.customXelect}>
                                        <Xelect id="TypeCountermeasureId"
                                            name="TypeCountermeasureId"
                                            multiple={false}
                                            getLabel={this.logic.getDetailLabel}
                                            getValue={this.logic.getDetailValue}
                                            getOptions={this.logic.filterDetails}
                                            delay={500}
                                            values={this.logic.details}
                                            onSelectionChange={this.logic.handleDetailChange}
                                            disabled={!activeSave}
                                        />
                                        <label>Tipo</label>
                                    </div>
                                    {this.errorFor('TypeCountermeasureId', 'Debe especificar el tipo de la contramedida.')}
                                </div>: null
                            
                        }
                        {
                            this.logic.countermeassureTypeId == CountermeasureType.Corrective ?
                                <div className="col s12 m5 l5">
                                    <input disabled={!activeSave}
                                        name={`cardredid_${this.logic.fiveWhyCountmeassure.Id}`}
                                        id={`cardredid_${this.logic.fiveWhyCountmeassure.Id}`}
                                        type="number"
                                        onChange={this.logic.handleChangeCardRed}
                                        value={this.logic.fiveWhyCountmeassure.CardRedId}
                                    />
                                    <label className="active" htmlFor={`cardredid_${this.logic.fiveWhyCountmeassure.Id}`}>Tarjeta roja</label>
                                    {this.errorFor('CardRedId', 'Debe especificar una tarjeta roja') }
                                </div> : null

                        }
                    </div>
                    {
                       
                    }
                    <div className="row">
                        
                        <div className="input-field col s12 m12 l12">
                            <div className={style.customXelect}>
                                <Xelect id="RootCausesNodeIds"
                                        name="RootCausesNodeIds"
                                        multiple={true}
                                        getLabel={this.logic.getFiveWhyNodeLabel}
                                        getValue={this.logic.getFiveWhyNodeValue}
                                        getOptions={this.logic.filterFiveWhyNode}
                                        delay={500}
                                        values={this.logic.fiveWhyCountmeassure.RootCausesNodeIds}
                                        onSelectionChange={this.logic.handleFiveWhyNodeChange}
                                        disabled={!activeSave}
                                />
                                <label>*Causa raíz</label>
                            </div>
                            {this.errorFor('RootCausesNodeIds', 'Debe especificar las casusas raíz.')}
                        </div>
                    </div>
                    <div className="row">
                        <div className="input-field col s12 m12 l12">
                            <div className={`${style.customXelect}`}>
                                <Xelect id="ResponsibleEmployee"
                                        name="ResponsibleEmployee"
                                        multiple={true}
                                        getLabel={this.logic.getEmployeeLabel}
                                        getValue={this.logic.getEmployeeValue}
                                        getOptions={this.logic.filterEmployee}
                                        delay={500}
                                        values={this.logic.fiveWhyCountmeassure.ResponsibleEmployee}
                                        onSelectionChange={this.logic.handleResponsibleEmployeeChange}
                                        disabled={!activeSave}
                                />
                                <label>Responsable</label>
                            </div>
                            {this.errorFor('ResponsibleEmployee', 'Debe especificar el empleado responsable.')}
                        </div>
                    </div>
                    <div className="row">

                        <div className="input-field col s12 m6 l6">
                            <i className="material-icons prefix">date_range</i>
                            <input disabled={ this.logic.fiveWhyCountmeassure.Id != undefined}
                                id="PlannedDate"
                                type="text"
                                className="datepicker"
                                value={this.logic.PlannedDateValidate ? moment(this.logic.PlannedDateValidate).format('MMM DD, YYYY') : ''}
                            />
                            <label className="active" htmlFor="PlannedDate">Fecha de planeación</label>
                            {this.errorFor('PlannedDate', 'Debe especificar la fecha de planeación.')}
                        </div>
                    </div>
                    <div className="row" style={{marginBottom:0}}>
                        <div className="input-field col s12 m12 l12">
                            <textarea disabled={!activeSave} 
                                      className={`materialize-textarea ${styles.sizeTextArea}`}
                                      value={this.logic.fiveWhyCountmeassure.CountermeassureDescription} 
                                      onChange={this.logic.handleDescriptionChange}>
                            </textarea>
                            <label className="active" htmlFor="countermeasure">Contramedida</label>
                            {this.errorFor('CountermeassureDescription', 'Debe especificar la contramedida aplicada.')}
                        </div>
                    </div>
                    <div className="row" style={{marginBottom: "43px"}}>
                        <div className="col s12 m6 l6">
                            {
                                activeSave?
                                    <FileUpload 
                                            containerName={"dascontainer"}
                                            onFileUpload={this.logic.handleEvidenciasUpload}
                                            textButton={"Adjuntar evidencia"} 
                                            icon={"far fa-image"}
                                            multiple={false}
                                            aceptedExtencion={[".jpg", ".png", ".jpeg", ".bmp", ".svg", ".pdf"]}
                                            objetBridge={null}
                                    >
                                    </FileUpload>
                                :
                                    null
                            }
                        </div>
                        <div className="col s12 m6 l6">
                            {
                                activeSave?
                                    <FileUpload containerName={"dascontainer"}
                                                onFileUpload={this.logic.handleAdjuntosUpload}
                                                textButton={"Adjuntar estándar"} 
                                                icon={"far fa-file-alt"}
                                                multiple={true}
                                                aceptedExtencion={[".doc",".docx", ".xsl", ".xslx", ".pdf", ".ppt", ".pptx"]}
                                                objetBridge={null}
                                    >
                                    </FileUpload>
                                :
                                    null
                            }
                        </div>
                    </div>
                    {
                        this.logic.fiveWhyCountmeassure.Evidences.length > 0?
                        <div className="row">
                                <div className="col s12 m12 l12">
                                {
                                    this.logic.fiveWhyCountmeassure.Evidences.map((evidence,i)=>
                                        this.evidenceBtn(evidence)
                                    )
                                }
                                </div>
                        </div>
                        :null
                    }
                    {
                        activeSave?
                        <div className="row" style={{marginBottom:0,textAlign:"center",paddingTop:15}}>
                            <div className="col s12 m8 l8" style={{textAlign:"right"}}>
                            {
                                this.logic.isSaveCounterMeasure?
                                    <i className={"fas fa-spinner fa-spin"}></i>
                                :
                                    <a href="#!" id="counterAdd" className={`waves-effect waves-green btn ${styles.btnSave}`} onClick={this.logic.handleSaveCountermeasureOnClick}>Guardar contramedida</a>
                            }      
                            </div>
                            <div className="col s12 m4 l4" style={{textAlign:"right"}}>
                                <div className="modal-footer">
                                    <button id="counterDelete" type="button" className={`waves-effect waves-green btn-flat ${styles.customHover}`} onClick={this.logic.handlerDeleteCountermeasure}><i className="fas fa-trash-alt"></i></button>
                                </div>
                            </div>
                        </div>
                        :null
                        }
                </div>
                
            </div>
        );
    }

    private evidenceBtn = (evidence:CountermeasureEvidence) =>{
        return (
            evidence.BlobUri ? 
            <a  key={`btn-evidence-${evidence.EvidenceId}-${evidence.BlobId}`}
                className={`wave wave-light btn btn-flat ${style.imgBtn}`}
                href={evidence.BlobUri}
                download={evidence.OriginalFileName}
                target={"_blank"}
            >
                <i className={evidence.EvidenceTypeId == 1 ? "far fa-image":"far fa-file-alt"} style={{marginRight:5}}></i>
                {evidence.OriginalFileName}
            </a>
            :null
        )
    }

    private modalvalidation = (active:boolean) => {
        return (
            <div id="modalvalidation" className={`modalvalidation modal ${styles.modalMain}`}>
                <h6>Validacion</h6>
                <div className="modal-content" style={{paddingBottom:0}}>
                <button type={"button"} className={`waves-effect waves-green btn-flat ${styles.customBtn}`} onClick={this.logic.closeModal}><i className="fas fa-times"></i></button>
                    <div className="row">
                        <div className="input-field col s12 m6 l6">
                            <i className="material-icons prefix">date_range</i>
                            <input disabled={active} 
                                   id="CompletedDate" 
                                   type="text" 
                                   className="datepicker"
                                   value={this.logic.DateValidate ? moment(this.logic.DateValidate).format('MMM DD, YYYY') : ''} 
                            />
                            <label className="active" htmlFor="ReportDate">Fecha de trabajo completado</label>
                            {this.errorFor('CompletedDate', 'Debe especificar la fecha en que se valido.')}
                        </div>
                    </div>
                    <div className="row">
                        <div className="input-field col s12 m12 l12">
                            <div className={styles.customXelect}>
                                <Xelect id="VerifiedByEmployeeId"
                                        name="VerifiedByEmployeeId"
                                        multiple={false}
                                        getLabel={this.logic.getEmployeeLabel}
                                        getValue={this.logic.getEmployeeValue}
                                        getOptions={this.logic.filterEmployee}
                                        delay={500}
                                        values={this.logic.ResponsibleEmployeeValidate}
                                        onSelectionChange={this.logic.handleResponsibleEmployeeValidateChange}
                                        disabled={active}
                                />
                                <label>Validado por</label>
                            </div>
                            {this.errorFor('VerifiedByEmployeeId', 'Debe especificar el empleado que verifico')}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <div className="row">
                        <div className="input-field col s6 m6 l6">
                            <button onClick={this.logic.closeModal} type={"button"} className={`waves-effect waves-green btn ${styles.btnCancel}`} style={{marginRight:"5px"}}>CANCELAR</button>
                        </div>
                        <div className="input-field col s6 m6 l6">
                            {
                                !active ?
                                    this.logic.isSaveValidation ?
                                        <i className={"fas fa-spinner fa-spin"}></i>
                                    :
                                        <button onClick={this.logic.handleSaveValidate} type={"button"} className={`waves-effect waves-green btn ${styles.btnSave}`} style={{marginRight:"5px"}}>GUARDAR</button>
                                :
                                    null
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private card = (fiveWhyCountmeassure:FiveWhyCountmeassure, active:boolean)=>{
        return(
            <div key={"counter-card-"+fiveWhyCountmeassure.Id} className={`col s12 m4 l3 ${styles.counterCard}`} onClick={(e)=>(this.logic.handleFillFiveWhyNode(e, fiveWhyCountmeassure))}>
                <div className={styles.counterHead}>
                    <p style={{marginBottom:3}}>
                        <i className="fas fa-user" style={{marginRight:2}}></i>
                        <strong>Responsable:</strong>
                        {fiveWhyCountmeassure.ResponsibleEmployee[0] != void 0?fiveWhyCountmeassure.ResponsibleEmployee[0].name:'No se a asignado un responsable'}
                    </p>
                    <p>
                        <i className="far fa-calendar-check" style={{ marginRight: 2 }}></i>
                        <strong>Fecha planeada:</strong>
                        {fiveWhyCountmeassure.PlannedDate ? moment(fiveWhyCountmeassure.PlannedDate).format('MMM DD, YYYY') : ''}
                    </p>
                    <p>
                        <i className="far fa-calendar-check" style={{marginRight:2}}></i> 
                        <strong>Trabajo completo:</strong>
                        {fiveWhyCountmeassure.CompletedDate ? moment(fiveWhyCountmeassure.CompletedDate).format('MMM DD, YYYY') : 'Sin fecha'}
                    </p>
                    {
                        fiveWhyCountmeassure.Verified?
                        <i className="fas fa-check" style={{float: "right",top: "5px",position: "absolute",right: "5px"}}></i>
                        :<button type={"button"} className={`wave wave-light btn ${styles.btnValidate}`} onClick={(e)=>(this.logic.handleShowValidatorModal(e, fiveWhyCountmeassure.Id))}>Validar</button>
                    }
                </div>
                <div className={styles.subBody}>
                    <p style={{fontSize:"13px"}}><strong style={{fontWeight:"bold",fontSize:"13px"}}>Causas raíz:</strong>{this.logic.formatIds(fiveWhyCountmeassure.RootCausesNodeIds)}</p>
                </div>
                <div className={styles.counterBody}>
                    <h6>No. Evidencias:</h6>
                    <p style={{padding:"0 5px 0 5px",fontSize:"0.8em"}}>
                        {
                        fiveWhyCountmeassure.Evidences != null ?
                            fiveWhyCountmeassure.Evidences.length > 0 ?
                                fiveWhyCountmeassure.Evidences.length
                                : 'No hay evidencias'
                            : 'No hay evidencias'
                        }
                    </p>
                    <h6>Contramedida:</h6>
                    <p style={{padding:"0 5px 0 5px"}}>
                        {fiveWhyCountmeassure.CountermeassureDescription}
                    </p>
                </div>
            </div>
        )
    }

    render() {
        let data = this.logic.rcfaBdaClientForm;
        const disableButtons = this.logic.SelectedCards.length < 1;
        //let active = (data.CurrentBdaStateId? (data.CurrentBdaStateId !== 4? true : false) :false);
        if (data.isEdit && !this.state.checkCard) {
            this.setState({
                active: (data.CurrentBdaStateId ? (data.CurrentBdaStateId !== 4 ? true : false) : false),
                checkCard: true
            });
        }
        return (
            <div className={"col s12 tabAnyBda"} style={{ display: "none" }} id="bdacountermeasure">
                {(data.isEdit && this.state.active) && data.CurrentBdaStateId != 4 ? this.editButton : ''}
                {(data.isEdit && !this.state.active && data.CurrentBdaStateId != 4) ? this.cancelEditButton : ''}
                <div className="row">
                    <h6 style={{textAlign:"center",margin:0}}>Causa raíz</h6>
                </div>
                <div className="row">
                    <table className="striped">
                        <thead>
                            <tr className={styles.tableHead}>
                                <th style={{width:"10%"}}>No.</th>
                                <th style={{width:"60%"}}>Causa raíz</th>
                                <th style={{width:"30%"}}>4 M's</th>
                            </tr>
                        </thead>
                        <tbody>  
                            {
                                this.logic.isLoadingCountermeasure == true?
                                <tr>
                                    <td colSpan={3}>
                                        <div className="progress">
                                            <div className="indeterminate"></div>
                                        </div>
                                    </td>
                                </tr>
                                :null
                            }                          
                        {
                            (this.logic.isLoadingCountermeasure == true || this.logic.rootCauses.length > 0)?
                            this.logic.rootCauses.map((rootCause:FiveWhyNode,index:number)=>{
                                return(<tr key={"cause_"+rootCause.Id}>
                                    <td>{rootCause.Id}</td>
                                    <td>{rootCause.Description}</td>
                                    <td>
                                        {rootCause.FourMs.map((fiveWhyFourM:FiveWhyFourM, indexx:number)=>
                                            fiveWhyFourM.Name + " / "
                                        )}
                                    </td>
                                </tr>)
                            })
                            :
                            <tr>
                                <td colSpan={3} style={{textAlign:"center"}}>No se registraron causas raíz</td>
                            </tr>
                        }
                        </tbody>
                    </table>
                </div>
                <div className="row">
                    <div className="col s12 m12 l12">
                        <button disabled={this.state.active} type={"button"} className={`wave wave-light btn ${styles.btnSave}`} style={{float:"right"}} onClick={this.logic.newCountermeasure}><i className="fas fa-plus-circle"></i> Agregar contramedida</button>
                    </div>
                </div>
                <div className="row" style={{marginBottom:0}}>
                    <h6 style={{textAlign:"center"}}>Contramedidas</h6>
                </div>
                <div className="row">
                    <div className="col s12 m12 l12">
                        {
                            this.logic.isLoadingCountermeasureCards ?
                                <div className="progress">
                                    <div className="indeterminate"></div>
                                </div>
                                : null
                        }
                        {
                            (this.logic.isLoadingCountermeasureCards == false || this.logic.fiveWhyCountmeassures.length > 0) ?
                                <div className="row">
                                    <table className="striped">
                                        <thead>
                                            <tr className={styles.tableHead}>
                                                <th style={{ width: "3%" }}>Validado</th>
                                                <th style={{ width: "3%" }}></th>
                                                <th style={{ width: "5%" }}>Folio</th>
                                                <th style={{ width: "10%" }}>Fecha planeada</th>
                                                <th style={{ width: "10%" }}>Trabajo completo</th>
                                                <th style={{ width: "20%" }}>Responsable</th>
                                                <th style={{ width: "5%" }}>Causas raíz</th>
                                                <th style={{ width: "5%" }}>No. Evidencias</th>
                                                <th style={{ width: "40%" }}>Contramedida</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {
                                                this.logic.isLoadingCountermeasure == true ?
                                                    <tr>
                                                        <td colSpan={3}>
                                                            <div className="progress">
                                                                <div className="indeterminate"></div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    : null
                                            }
                                            {
                                                (this.logic.isLoadingCountermeasure == true || this.logic.fiveWhyCountmeassures.length > 0) ?
                                                    this.logic.fiveWhyCountmeassures.map((countmeassure, index: number) => {
                                                        return (<tr key={"countmeassure_" + countmeassure.Id}>
                                                            <td>
                                                                {
                                                                    countmeassure.Verified ?
                                                                        <i className="fas fa-check" style={{ float: "left", top: "5px", right: "5px" }}></i>
                                                                        : <button type={"button"} className={`wave wave-light btn ${styles.btnValidate}`} onClick={(e) => (this.logic.handleShowValidatorModal(e, countmeassure.Id))}>Validar</button>
                                                                }
                                                            </td>
                                                            <td onClick={(e) => (this.logic.handleFillFiveWhyNode(e, countmeassure))}>
                                                                {
                                                                    countmeassure.Verified ? '' : 
                                                                        this.logic.isDelayed(countmeassure) ?
                                                                            <img style={{ maxWidth: '30%' }} src="./images/rojo.png" alt="Circulo" /> :
                                                                            <img style={{ maxWidth: '30%' }} src="./images/verde.png" alt="Circulo" />
                                                                }
                                                            </td>
                                                            <td onClick={(e) => (this.logic.handleFillFiveWhyNode(e, countmeassure))}>{countmeassure.Id}</td>
                                                            <td onClick={(e) => (this.logic.handleFillFiveWhyNode(e, countmeassure))}>{moment(countmeassure.PlannedDate).format('MMM DD, YYYY')}</td>
                                                            <td onClick={(e) => (this.logic.handleFillFiveWhyNode(e, countmeassure))}>{countmeassure.CompletedDate ? moment(countmeassure.CompletedDate).format('MMM DD, YYYY') : 'Sin fecha'}</td>
                                                            <td onClick={(e) => (this.logic.handleFillFiveWhyNode(e, countmeassure))}>{this.logic.formatResponsables(countmeassure.ResponsibleEmployee)}</td>
                                                            <td onClick={(e) => (this.logic.handleFillFiveWhyNode(e, countmeassure))}>{this.logic.formatIds(countmeassure.RootCausesNodeIds)}</td>
                                                            <td onClick={(e) => (this.logic.handleFillFiveWhyNode(e, countmeassure))}>{countmeassure.Evidences != null ?
                                                                countmeassure.Evidences.length > 0 ?
                                                                    countmeassure.Evidences.length
                                                                    : 'No hay evidencias'
                                                                : 'No hay evidencias'}</td>
                                                            <td onClick={(e) => (this.logic.handleFillFiveWhyNode(e, countmeassure))}>{countmeassure.CountermeassureDescription}</td>
                                                        </tr>)
                                                    })
                                                    :
                                                    <tr>
                                                        <td colSpan={3} style={{ textAlign: "center" }}>No se registraron contramedidas</td>
                                                    </tr>
                                            }
                                        </tbody>
                                    </table>
                                </div>

                                : <div className="row" style={{ textAlign: "center" }}>
                                    No se han registrado contramedidas
                                </div>
                        }
                    </div>
                </div>
                {this.modalCountermeasure(this.state.active)}
                {this.modalvalidation(this.state.active)}
            </div>
        );
    }
}