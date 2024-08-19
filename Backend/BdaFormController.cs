using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.ComponentModel.DataAnnotations;
using System.Web.Http.ModelBinding;
using Heineken.Factory.Applications.API.Models;
using Heineken.Factory.Applications.DataAccess;
using Heineken.Factory.Applications.Business.Rcfa.Bda;
using Heineken.Factory.Applications.Business;
using Heineken.Factory.Applications.Business.Rcfa;
using Heineken.Factory.Applications.API.Models.Rcfa.Bda;

namespace Heineken.Rfca.PublicApi.Controllers
{ 
    [RoutePrefix("api/bda")]
    [Authorize]
    public class BdaFormController: ApiController
    {
        public BdaFormController()
        {

        }

        [HttpPost]
        [Route("", Name = nameof(SaveBdaForm))]
        public IHttpActionResult SaveBdaForm([Required, FromBody]BdaClientForm clientForm)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using (var ctx = new HeinekenFactoryDBModel())
            using (var bdaBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(() => ctx)))
            {
                BdaDocument dasDoc = null;
                if (clientForm.Id > 0)
                {
                    dasDoc = bdaBoard.GetBdaDocument(clientForm.Id.Value, true);
                    dasDoc = bdaBoard.UpdateDbFields(dasDoc, clientForm);
                }
                else
                {
                    clientForm.CreatedTimestamp = DateTime.UtcNow;
                    BdaForm dbDas = AutoMapper.Mapper.Map<BdaClientForm, BdaForm>(clientForm);
                    dasDoc = bdaBoard.CreateBda(dbDas);
                }

                var currentState = dasDoc.CurrentState;
                var report = bdaBoard.EvaluateStatusTransition(dasDoc, State.FromId(currentState.Id + 1, RcfaTypes.Bda));
                clientForm = dasDoc.ToClientForm();
                clientForm.CanGoToNextState = report.CanBeApplied;
                clientForm.Observations = report.Observations;

                return CreatedAtRoute(nameof(SaveBdaForm), new { bdaFormId = clientForm.Id }, clientForm);
            }
        }

        [HttpGet]
        [Route("{bdaFormId:int:range(1,2147483647)}/validation/{targetBdaStateId:int:range(1, 2147483647)}", Name = nameof(GetBdaFormStateTransitionAnalysis))]
        public IHttpActionResult GetBdaFormStateTransitionAnalysis(
            [FromUri, Required, Range(1, int.MaxValue)]int bdaFormId,
            [FromUri, Required, Range(1, int.MaxValue)]int targetBdaStateId)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using (var dbCtx = new HeinekenFactoryDBModel())
            using (var bdaBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(() => dbCtx)))
            {
                try
                {
                    var bdaDoc = bdaBoard.GetBdaDocument(bdaFormId, true);
                    var targetState = Heineken.Factory.Applications.Business.Rcfa.State.FromId(targetBdaStateId, RcfaTypes.Bda);
                    var stateTransitionValidationReport = bdaBoard.EvaluateStatusTransition(bdaDoc, targetState);
                    return Ok(stateTransitionValidationReport);
                }
                catch (ClientDataNotFoundException ex)
                {
                    return NotFound();
                }
            }
        }

        [HttpPost]
        [Route("changestate", Name = nameof(BdaChangeState))]
        public IHttpActionResult BdaChangeState([Required, FromBody]BdaClientForm clientForm)
        {
            if (clientForm == null)
            {
                ModelState.AddModelError(nameof(clientForm), "Request has no data");
                return BadRequest(ModelState);
            }
            if (!clientForm.Id.HasValue)
            {
                ModelState.AddModelError($"{nameof(clientForm)}.{nameof(clientForm.Id)}", "Id is required");
                return BadRequest(ModelState);
            }

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using (IHeinekenFactoryDBModelDbContext ctx = new HeinekenFactoryDBModel())
            using (var bdaBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(() => ctx)))
            {
                var bdaDoc = bdaBoard.GetBdaDocument(clientForm.Id.Value, true);
                var currentState = bdaDoc.CurrentState;

                //update save db data
                bdaBoard.UpdateDbFields(bdaDoc, clientForm);

                //get state to go to
                var nextState = State.FromId(currentState.Id + 1, RcfaTypes.Bda);

                //evaluate state change
                var transitionEvaluation = bdaBoard.EvaluateStatusTransition(bdaDoc, nextState);

                //if cannot transition, return proper response
                if (!transitionEvaluation.CanBeApplied)
                {
                    clientForm = bdaDoc.ToClientForm();
                    clientForm.CanGoToNextState = false;
                    clientForm.Observations = transitionEvaluation.Observations;
                    return Content(HttpStatusCode.Forbidden, clientForm);
                }

                //if everything ok, let's transition state
                bdaBoard.ChangeState(bdaDoc, nextState);
                return Ok(bdaDoc.ToClientForm());
            }
        }

        [AllowAnonymous]
        [HttpPost]
        [Route("changestatebatch", Name = nameof(ChangeBdaStateBatch))]
        public IHttpActionResult ChangeBdaStateBatch([Required, FromBody]List<BdaBatchChangeStatusItem> data)
        {
            if (data == null)
            {
                ModelState.AddModelError(nameof(data), "Request has no data");
                return BadRequest(ModelState);
            }

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var docsIds = data.Select(d => d.Id.Value).ToArray();
            using (IHeinekenFactoryDBModelDbContext ctx = new HeinekenFactoryDBModel())
            using (var bdaBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(() => ctx)))
            {

                var dasDocs = bdaBoard.GetDasDocuments(docsIds, true);

                //get state to go to
                var bdaDocAndNewState = (from a in dasDocs
                                         join b in data on a.Id equals b.Id
                                         select new
                                         {
                                             bdaDoc = a,
                                             NextStateId = b.NextStatusId
                                         }).ToArray();

                //capture transition evaluations
                var evaluationReports = new List<RcfaBdaPhaseTransitionValidationReport>();
                //change all docs
                foreach (var ddocAndNewState in bdaDocAndNewState)
                {
                    if(ddocAndNewState.bdaDoc.CurrentState == State.FromId(8, RcfaTypes.Bda))
                    {
                        continue;
                    }
                    var nextState = State.FromId(ddocAndNewState.NextStateId.Value, RcfaTypes.Bda);
                    //evaluate state change
                    var transitionEvaluation = bdaBoard.EvaluateStatusTransition(ddocAndNewState.bdaDoc, nextState);
                    evaluationReports.Add(transitionEvaluation);

                    if (!transitionEvaluation.CanBeApplied)
                        continue;
                    bdaBoard.ChangeState(ddocAndNewState.bdaDoc, nextState);
                }

                //if everything ok, let's transition state
                return Ok(evaluationReports);
            }
        }

        [HttpPost]
        [Route("{bdaFormId:int:range(1,2147483647)}/newchangedpart", Name = nameof(PostAddEmptyBdaRepairChangedPart))]
        public IHttpActionResult PostAddEmptyBdaRepairChangedPart([FromUri, Required, Range(1, int.MaxValue)]int? bdaFormId)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using (IHeinekenFactoryDBModelDbContext ctx = new HeinekenFactoryDBModel())
            using (var dasBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(() => ctx)))
            {
                var newPart = dasBoard.CreateEmptyChangedComponent(bdaFormId.Value);
                return Ok(newPart);
            }
        }

        [HttpGet]
        [Route("deleteChangedpart/{bdaChangedComponentsId:int:range(1,2147483647)}", Name = nameof(DeleteChangedComponent))]
        public IHttpActionResult DeleteChangedComponent([FromUri, Required, Range(1, int.MaxValue)]int bdaChangedComponentsId)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using (IHeinekenFactoryDBModelDbContext ctx = new HeinekenFactoryDBModel())
            using (var dasBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(() => ctx)))
            {
                var newPart = dasBoard.DeleteChangedComponent(bdaChangedComponentsId);
                return Ok(newPart);
            }
        }

        [HttpGet]
        [Route("{bdaFormId:int}", Name = nameof(GetBdaForm))]
        public IHttpActionResult GetBdaForm([Required, Range(1, int.MaxValue), FromUri]int bdaFormId)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using (var dbCtx = new HeinekenFactoryDBModel())
            using (var bdaBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(()=> dbCtx)))
            {
                try
                {
                    var bdaDoc = bdaBoard.GetBdaDocument(bdaFormId, false);
                    var bdaForm = bdaDoc.ToClientForm();
                    return Ok(bdaForm);
                }
                catch (ClientDataNotFoundException ex)
                {
                    return NotFound();
                }
            }
        }

        [HttpGet]
        [Route("{bdaFormId:int:range(1,2147483647)}/followup", Name = nameof(GetBdaFormFollowUpWeeks))]
        public IHttpActionResult GetBdaFormFollowUpWeeks([Required, FromUri, Range(1, int.MaxValue)]int? bdaFormId)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using (IHeinekenFactoryDBModelDbContext ctx = new HeinekenFactoryDBModel())
            using (var bdaBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(() => ctx)))
            {
                var followUpWeeks = bdaBoard.GetFollowUpWeeks(bdaFormId.Value);
                return Ok(followUpWeeks);
            }
        }
        
        [HttpGet]
        [Route("{bdaFormId:int:range(1,2147483647)}/recurrences", Name = nameof(GetBdaFormRecurrences))]
        public IHttpActionResult GetBdaFormRecurrences([Required, FromUri, Range(1, int.MaxValue)]int? bdaFormId)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using (IHeinekenFactoryDBModelDbContext ctx = new HeinekenFactoryDBModel())
            using (var bdaBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(() => ctx)))
            {
                var recurrenceLogs = bdaBoard.GetRecurrenceLog(bdaFormId.Value);
                return Ok(recurrenceLogs);
            }
        }

        [HttpPost]
        [Route("{bdaFormId:int:range(1,2147483647)}/recurrences", Name = nameof(PostBdaFormRecurrences))]
        public IHttpActionResult PostBdaFormRecurrences([Required, FromUri, Range(1, int.MaxValue)]int? bdaFormId,
            [Required, FromBody]RecurrenceLogItem model)
        {
            if (model == null)
                ModelState.AddModelError("", new ValidationException("No data provided"));

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using (IHeinekenFactoryDBModelDbContext ctx = new HeinekenFactoryDBModel())
            using (var bdaBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(() => ctx)))
            {
                var recurrenceLogs = bdaBoard.MarkRecurrence(bdaFormId.Value, model);
                return Ok(recurrenceLogs);
            }
        }


        [HttpPost]
        [Route("cancel", Name = nameof(BdaCancel))]
        public IHttpActionResult BdaCancel([Required, FromBody]BdaCancelModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            using (IHeinekenFactoryDBModelDbContext ctx = new HeinekenFactoryDBModel())
            using (var bdaBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(() => ctx)))
            {
                var bdaDoc = bdaBoard.GetBdaDocument(model.Id, true);
                var currentState = bdaDoc.CurrentState;

                //update save db data
                bdaBoard.CancelBda(bdaDoc, model);

                //if everything ok, let's transition state
                return Ok(bdaDoc.ToClientForm());
            }
        }
        [HttpPost]
        [Route("close", Name = nameof(BdaClose))]
        public IHttpActionResult BdaClose([Required, FromBody] BdaCancelModel model)
        {

            using (IHeinekenFactoryDBModelDbContext ctx = new HeinekenFactoryDBModel())
            using (var bdaBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(() => ctx)))
            {
                var bdaDoc = bdaBoard.GetBdaDocument(model.Id, true);
                var currentState = bdaDoc.CurrentState;

                //update save db data
                bdaBoard.CloseBda(bdaDoc, model);

                //if everything ok, let's transition state
                return Ok(bdaDoc.ToClientForm());
            }
        }
        [HttpPost]
        [Route("no-apply-gp", Name = nameof(BdaNoApplyGP))]
        public IHttpActionResult BdaNoApplyGP([Required, FromBody] BdaNoApplyGPModel model)
        {

            using (IHeinekenFactoryDBModelDbContext ctx = new HeinekenFactoryDBModel())
            using (var bdaBoard = new BdaBoard(new Lazy<IHeinekenFactoryDBModelDbContext>(() => ctx)))
            {
                var bdaDoc = bdaBoard.GetBdaDocument(model.Id, true);
                var currentState = bdaDoc.CurrentState;

                //update save db data
                bdaBoard.NoApplyGPBda(bdaDoc, model);

                //if everything ok, let's transition state
                return Ok(bdaDoc.ToClientForm());
            }
        }
    }
}