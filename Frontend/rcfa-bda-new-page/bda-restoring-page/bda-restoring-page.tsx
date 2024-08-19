import * as React from 'react';
import {observer} from "mobx-react";
import RestoringPageLogic from "./bda-restoring-page-logic";
import * as styles from './bda-restoring-page.scss';
import { RcfaBdaClientForm } from 'ClientApp/models/rcfa-bda-form';
import PixieImageEditorWidget from '../../../common/pixie-image-editor-widget/pixie-image-editor-widget';
import * as moment from "moment";
import { RcfaBdaChangedComponents } from '../../../../models/rcfa-bda-changed-components';
import FileUpload from '../../../common/file-upload/file-upload';
interface RestoringPageProps {
    rcfaBdaClientForm:RcfaBdaClientForm;
}

interface IState {
    active: boolean,
    checkCard: boolean,
    cardExist: boolean
}
@observer
export default class BdaRestoringPage extends React.Component<RestoringPageProps, IState> {

    public logic: RestoringPageLogic;

    constructor(props: any) {
        super(props);
        this.logic = new RestoringPageLogic(this.props.rcfaBdaClientForm, this);
        this.state = {
            active: false,
            checkCard: false,
            cardExist: false
        }
    }

    componentDidMount() {
        $("#ImmediateLbl").addClass("active");
        $("#defectLbl").addClass("active");
        this.logic.onComponentDidMount();
    }

    editBda() {
        if (this.state.active) {
            this.setState({ active: false });
            this.logic.rcfaBdaClientForm.EditStageId = 2;
        } else {
            this.setState({ active: true });
            this.logic.rcfaBdaClientForm.EditStageId = undefined;
        }
    }
    async handleFormSubmit(changeState: boolean) {
        let svgArray: File[] = [];
        if (this.logic.pixieImageEditorWidget) {
            const drawingConocimiento = this.logic.pixieImageEditorWidget.getBlobAsFile();
            if (drawingConocimiento) {
                svgArray.push(drawingConocimiento);
            }
        }
        return await this.logic.handleFormSubmit(changeState, svgArray);
    }

    private errorFor(field: string, customMessage?: string) {
        if (!this.logic.modelStateErrors) return null;
        const message = this.logic.validationMessageFor(field);
        if (!message || !message.length) return null;
        return (
            <div className={styles.errorInline}>{customMessage ? customMessage : message}</div>
        );
    }

    private modal= () => {
        return (
            <div id="modalCodigo" className={`modalCodigo modal ${styles.modalMain}`}>
                <h6>Código</h6>
                <div className="modal-content" style={{paddingBottom:0}}>
                <button type={"button"} className={`waves-effect waves-green btn-flat ${styles.customBtn}`} onClick={this.logic.closeModal}><i className="fas fa-times"></i></button>
                    <div className="row">
                        <div className="card-image row">
                            <img src={this.logic.sasToken} width="100%" height="100%" />
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <div className="row">
                        <div className="input-field col s6 m6 l6">
                            <button onClick={this.logic.closeModal} type={"button"} className={`waves-effect waves-green btn ${styles.btnCancel}`} style={{marginRight:"5px"}}>CANCELAR</button>
                        </div>
                    </div>
                </div>
            </div>
        );
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
    render() {
        let data = this.logic.rcfaBdaClientForm;
        if (data.isEdit && !this.state.checkCard) {
            this.setState({
                active: (data.CurrentBdaStateId ? (data.CurrentBdaStateId !== 2 ? true : false) : false),
                checkCard: true
            });
        }
        let listNumber: Array<number> = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60]
        return (
            <div id="bdarestoring" className={"col s12 tabAnyBda"}>
                {(data.isEdit && this.state.active) && data.CurrentBdaStateId != 2 ? this.editButton : ''}
                {(data.isEdit && !this.state.active) && data.CurrentBdaStateId != 2 ? this.cancelEditButton : ''}
                <div className="row">
                    <div className="input-field col s12 m5 l5">
                        <label id={`lbl_MechanicAssignedEmployeeName`}>{this.logic.rcfaBdaClientForm.MechanicAssignedEmployeeName}</label>
                        <label id="ImmediateLbl" className="active" htmlFor="ImmediateAction">Mecánico asignado.</label>
                    </div>
                    <div className="input-field col s12 m3 l3">
                        <i className="material-icons prefix">date_range</i>
                        <input disabled={this.state.active} 
                               id="RestoringFinishDate" 
                               type="text" 
                               className="datepicker"
                               value={data.MechanicalWorkDoneDatetime ? moment(data.MechanicalWorkDoneDatetime).format('MMM DD, YYYY') : moment(new Date()).format("MMM DD, YYYY")} 
                        />
                        <label className="active" htmlFor="RestoringFinishDate">Seleccione la fecha de finalización</label>
                        {this.errorFor('RestoringFinishDate', 'Debe especificar la fecha fin de la restauracion')}
                    </div>
                    <div className="input-field col s12 m2 l2">
                        <i className="material-icons prefix">hourglass_empty</i>
                        <select key={`BdaTotalRepairTimeHours-key`}
                                id={`BdaTotalRepairTimeHours`} 
                                onChange={this.logic.handleRepairTimeHoursChange} 
                                className={`select material-opt-in`} 
                                disabled={this.logic.rcfaBdaClientForm.CurrentBdaStateId == 2 ? false : true} 
                                value={this.logic.rcfaBdaClientForm.RepairTimeHours} >
                            <option key={`repair-time-hours-page-select-status-${-1}`} value={undefined}>{'-'}</option>
                            {
                                listNumber.map((item) => {
                                    return (
                                        <option key={`repair-time-hours-page-select-status-${item}`} value={item}>{item}</option>
                                    )
                                })
                            }
                        </select>
                        <label htmlFor="BdaRepairTimeSeconds" className={`active ${styles.customTitle}`}>Ingrese el tiempo de reparación.</label>
                        <label htmlFor="BdaTotalFalureTimeHours" className="active">horas</label>
                        {this.errorFor('TotalFalureTimeHours', 'Debe especificar la hora de inciio problema')}
                    </div>
                    <div className="input-field col s12 m2 l2">
                        <i className="material-icons prefix">hourglass_empty</i>
                        <select key={`BdaTotalRepairTimeMinutes-key`}
                                id={`BdaTotalRepairTimeMinutes`} 
                                onChange={this.logic.handleRepairTimeMinutesChange} 
                                className={`select material-opt-in`} 
                            disabled={this.state.active} 
                                value={this.logic.rcfaBdaClientForm.RepairTimeMinutes} >
                            <option key={`repair-time-minutes-page-select-status-${-1}`} value={undefined}>{'-'}</option>
                            {
                                listNumber.map((item) => {
                                    return (
                                        <option key={`repair-time-minutes-page-select-status-${item}`} value={item}>{item}</option>
                                    )
                                })
                            }
                        </select>
                        <label htmlFor="BdaTotalFalureTimeHours" className="active">&nbsp;</label>
                        <label htmlFor="BdaRepairTimeMinutes" className="active">minutos</label>
                        {this.errorFor('RepairTimeMinutes', 'Debe especificar la hora de inciio problema')}
                    </div>
                </div>
                <div className="row">
                    <div className="input-field col s12 m6 l6">
                        <textarea disabled={this.state.active}
                            className={"materialize-textarea"}
                               name="FailureAndRepairDescription" 
                               id="BdaFailureAndRepairDescription" 
                               onChange={(e)=> data.FailureAndRepairDescription = e.currentTarget.value}
                               value={data.FailureAndRepairDescription || ''}
                        />
                        <label className="active" htmlFor="BdaFailureAndRepairDescription">Descripción de la falla hallada y reparación (qué se hizo para arreglar el problema)</label>
                        {this.errorFor('FailureAndRepairDescription', 'Debe especificar la descripción')}
                    </div>
                    <div className="input-field col s12 m6 l6">
                        <textarea disabled={this.state.active}
                            className={"materialize-textarea"}
                               name="FailureModeDescription" 
                               id="BdaFailureModeDescription" 
                               onChange={(e)=> data.FailureModeDescription = e.currentTarget.value}
                               value={data.FailureModeDescription || ''}
                        />
                        <label className="active" htmlFor="BdaFailureModeDescription">Ingrese el modo de fallo (situación que resultó en un fallo funcional)</label>
                        {this.errorFor('FailureModeDescription', 'Debe especificar la descripción')}
                    </div>
                </div>
                <div className="row">
                    <div className="col s12 m6 l12">
                        <PixieImageEditorWidget
                            showOnModal={true}
                            ref={(ref) => {
                                console.log("ref", ref);
                                return this.logic.pixieImageEditorWidget = ref
                            }}
                            importBlobSasUrl={this.logic.rcfaDescriptionImageBlobUri}
                        />
                        <input disabled={this.state.active} name="descriptionPageFile" type="hidden" ref={(fileInput) => this.logic.descriptionPageFile = fileInput} />
                    </div>
                </div>
                <div className="row">
                    <div className="col s12" style={{backgroundColor: "#ddd",textAlign: "center"}}>
                        <h6>Componentes cambiados</h6>
                    </div>
                </div>
                {
                   data.ChangedComponents.map((itm:RcfaBdaChangedComponents, index:number) =>{
                        return(
                            <div key={`div-row-changed-components-${index}`} className="row">
                                <div className="col s12 m5 l5">
                                    <input disabled={this.state.active} 
                                        name={`DescriptionComponent_${itm.Id}`} 
                                        id={`DescriptionComponent_${itm.Id}`} 
                                        type="text"
                                        onChange={this.logic.handleChangeDescriptionComponent}
                                        value={itm.ChangedComponentDescription ||''}
                                    />
                                    <label className="active" htmlFor={`DescriptionComponent_${itm.Id}`}>Ingrese la descripción del componente</label>
                                </div>
                                <div className="col s12 m3 l3">
                                    <input disabled={this.state.active} 
                                           name={`ReplacementNumber_${itm.Id}`} 
                                           id={`ReplacementNumber_${itm.Id}`} 
                                           type="text"
                                           onChange={this.logic.handleChangeReplacementNumber}
                                           value={itm.PartNumberText ||''}
                                    />
                                    <label className="active" htmlFor={`ReplacementNumber_${itm.Id}`}>Ingrese el número de reemplazo</label>
                                </div>
                                <div className="col s12 m3 l3">
                                   {
                                       itm.sasToken?
                                        <button key={`btn-number-repair-${itm.Id}`}
                                                className={`wave wave-light btn btn-flat ${styles.imgBtn}`}
                                                onClick={(e)=> this.logic.handleLoadModal(e, itm.sasToken || '')}
                                        >
                                            <i className={"fas fa-barcode"} style={{marginRight:5}}></i>
                                            Ver código
                                        </button>
                                    :
                                            this.state.active ?
                                        <button type="button" disabled={true} className={`wave wave-light btn ${styles.btnSave}`} style={{float:"left"}}>
                                            <i className={"fas fa-barcode"} style={{marginRight:5}}></i>
                                            Sin código
                                        </button>
                                        :
                                            <FileUpload key={`btn-number-repair-${itm.Id}`}
                                                        containerName={"bdacontainer"}
                                                        onFileUpload={this.logic.handleCodeUpload}
                                                        textButton={"Adjuntar"} 
                                                        icon={"fas fa-barcode"}
                                                        multiple={false}
                                                        aceptedExtencion={[".jpg", ".png", ".jpeg", ".bmp", ".svg", ".pdf"]}
                                                        onStartUpload={this.logic.handleCodeStartUpload}
                                                        onUploadFinish ={this.logic.handleCodeFinish}
                                                        onUploadFail={this.logic.handleCodeFail}
                                                        objetBridge={itm}
                                            >
                                            </FileUpload>
                                   }
                                </div>
                                <div className="col s12 m1 l1">
                                    <button type={"button"}
                                            className={`btn btn-flat ${styles.imgBtn}`}
                                            onClick={(e) => this.logic.handleDeleteChangedComponent(e, itm.Id||0)}
                                        disabled={this.state.active}
                                    >
                                        <i className={"fas fa-trash-alt"} style={{marginRight:5}}></i>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                }    
                <div className="row">
                    <div className="col s12 m5 l5">
                    {
                        this.logic.isDisabledBtnAddComponent ?
                            <i className={"fas fa-spinner fa-spin"}></i>
                        :
                        <button type={"button"}
                                className={`wave wave-light btn btn-flat ${styles.imgBtn}`}
                                onClick={this.logic.handleAddChangedComponent}
                                    disabled={this.state.active}
                        >
                            <i className={"fas fa-plus-circle"} style={{marginRight:5}}></i>
                            Agregue un componente.
                        </button>

                    }
                    </div>
                </div> 
                {this.modal()}
            </div>
        );
    }
}