/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * 
 */
define(['N/runtime', 'N/record', 'N/search', 'N/redirect', 'N/ui/serverWidget'], function(runtime, record, search, redirect, ui) {

    function beforeLoad(context) {
        
        var form = context.form;
        var recObj = context.newRecord;
        var recId = recObj.getValue({fieldId: 'id'});
        var status = recObj.getValue({fieldId: 'approvalstatus'});
        var stdStatus = recObj.getValue({fieldId: 'orderstatus'});
        var prApprovalFlowRec = recObj.getValue({fieldId: 'custbody_pr_approval_flow'});
        var userObj = runtime.getCurrentUser();
        var currentUserRole = userObj.role;
        var currentUserId   = userObj.id;
      
        log.debug({title: 'Record Id', details: recId});
        log.debug({title: 'Transaction Status', details: status});
        log.debug({title: 'Transaction Standard Status', details: stdStatus});
        log.debug({title: 'currentUserRole', details: currentUserRole});
        log.debug({title: 'currentUserId', details: currentUserId});

        if(context.type == context.UserEventType.VIEW) {
            
            form.clientScriptModulePath  = "SuiteScripts/YIL_Purchase_Order_CL.js";
            
            if(status == 1) {   //1 : Pending Approval
                if(!prApprovalFlowRec) {
                    var submitForApprovalBtn = form.addButton({id: 'custpage_submit_apprvl', label: 'Submit For Approval', functionName: "submitApprovalFun("+recId+");"})
                }
                else {
                    var nextLevel = '';
                    nextLevel = _validateNextApprover(currentUserId, currentUserRole, prApprovalFlowRec);
                    //Admin Role and Respective User Id Validation
                    if(nextLevel != '') {
                        
                        //Approver Button
                        var approvalBtn = form.addButton({id: 'custpage_apprv_btn', label: 'Approve', functionName: "approvePurchaseRequestFlow("+recId+","+prApprovalFlowRec+","+nextLevel+");"})

                        //Reject Button
                        var rejectBtn = form.addButton({id: 'custpage_rejct_btn', label: 'Reject', functionName: "rejectPurchaseRequestFlow("+recId+","+prApprovalFlowRec+","+nextLevel+");"});
                    }
                    
                    //Send Notification Button
                    //Admin Role and Respective User Id
                    var sendNotifBtn = form.addButton({id: 'custpage_sendnotf_btn', label: 'Send Notification', functionName: "sendNotification("+recId+","+prApprovalFlowRec+");"});
                    
                    var backButton = form.getButton("back");
                    log.debug({title: 'BackButton', details: backButton});
                    //backButton.isHidden = true;

                }
            }
            else if(status == 2 && stdStatus != "H" && stdStatus != "G") {  //2 : Approved
                if(prApprovalFlowRec) {
                    //Cancel Button
                    var prSearchObj = search.create({type: 'purchaseorder', id: recId, filters:[['internalid',search.Operator.ANYOF, recId], "AND", ['mainline', search.Operator.IS, false], "AND", [['appliedtotransaction', search.Operator.NONEOF, '@NONE@'],"OR",['applyingtransaction', search.Operator.NONEOF, '@NONE@']]], columns:[search.createColumn({name: 'internalid'})]});
                    log.debug({title: "Search Count", details: prSearchObj.runPaged().count});
                    if(prSearchObj.runPaged().count == 0) {
                        var stdCloseButton = form.getButton("closeremaining");
                        if(stdCloseButton) {
                            stdCloseButton.isHidden = true;
                        }
                        
                        var cancelBtn = form.addButton({id: 'custpage_cancel_btn', label: 'Cancel PO', functionName: "cancelRequest("+recId+","+prApprovalFlowRec+");"});
                    }
                }
            }
            
            if(prApprovalFlowRec) {
                var editButton = form.getButton("edit");
                if(editButton) { editButton.isHidden = true; }
            }
        }
        else if(context.type == context.UserEventType.EDIT) {
            
            if(prApprovalFlowRec) {
                log.debug({title: 'Found here', details: 'In Eidt Mode'})
                redirect.toRecord({id: recId, type: 'purchaseorder', isEditMode: false});
            }
            
        }
        if(status == 1 || status == 3) {    //1 : Pending Approval, 3 : Rejected
            form.title = "Purchase Request";
        }
        
        if(prApprovalFlowRec) {
            var subTabObj = form.addTab({id: 'custpage_pr_apvl_flow',label: 'PR Approval Flow'});
            var prafObj = record.load({type: 'customrecord_pr_approval_flow', id: prApprovalFlowRec});
            var noOfLevels = prafObj.getValue({fieldId: 'custrecord_no_of_level'});

            for(var i=1;i<=noOfLevels;i++) {
                
                var prafAprvId = 'custrecord_approver_' + i;
                var prafStautsId = 'custrecord_approval_status_' + i;
                var prafSkipId = 'custrecord_approval_skip_' + i;
                
                var approverId = prafObj.getValue({fieldId: prafAprvId.toString()});
                var statusId = prafObj.getValue({fieldId: prafStautsId.toString()});
                var skipValue = prafObj.getValue({fieldId: prafSkipId.toString()});
                log.debug({title: "skipValue", details: skipValue});
                var fieldGroupId = 'custpage_fg_lvl_'+i;
                var fieldGroupLbl = 'Level '+i;
                form.addFieldGroup({id: fieldGroupId, label: fieldGroupLbl, tab: 'custpage_pr_apvl_flow'});

                var custprafAprvId = 'custpage_approver_' + i;
                var custprafStautsId = 'custpage_approval_status_' + i;
                var custprafSkipId = 'custpage_approval_skip_' + i;

                var custprafAprvLb = 'Level ' + i + ' Approver';
                var custprafStautsLb = 'Level ' + i + ' Approval Status';
                var custprafSkipLb = 'Level ' + i + ' Skip Approval?';

                var aprverFld = form.addField({id: custprafAprvId.toString(), type: ui.FieldType.SELECT,label: custprafAprvLb, source: 'employee', container: fieldGroupId.toString()});
                var stautsFld = form.addField({id: custprafStautsId.toString(), type: ui.FieldType.SELECT,label: custprafStautsLb, source: 'customlist_pr_level_status', container: fieldGroupId.toString()});
                var skipFld   = form.addField({id: custprafSkipId.toString(), type: ui.FieldType.CHECKBOX,label: custprafSkipLb, container: fieldGroupId.toString()});

                if(skipValue) {
                    skipValue = "T";
                }
                else {
                    skipValue = "F";
                }
                aprverFld.defaultValue = approverId;
                stautsFld.defaultValue = statusId;
                skipFld.defaultValue = skipValue;

                aprverFld.updateDisplayType({displayType : ui.FieldDisplayType.INLINE});
                stautsFld.updateDisplayType({displayType : ui.FieldDisplayType.INLINE});
                skipFld.updateDisplayType({displayType : ui.FieldDisplayType.INLINE});

            }
        }
        
    }
    function beforeSubmit(context) {

    }
    function afterSubmit(context) {

    }

    function _validateNextApprover(currentUserId, currentUserRole, prApprovalFlowId) {
        
        var prAprvFlowObj = record.load({type: 'customrecord_pr_approval_flow', id:prApprovalFlowId});
        var nextApprovalLevel   = '';
        var adminLevel = '';

        if(prAprvFlowObj != null) {

            var noOfLevels = prAprvFlowObj.getValue({fieldId: 'custrecord_no_of_level'});
            var empFound            = false;
            for(var l=1;l<=noOfLevels;l++) {
                
                var approverFieldText = "custrecord_approver_"+l;
                var statusFieldText = "custrecord_approval_status_"+l;
                
                log.debug({title: 'approverFieldText', details: approverFieldText});
                log.debug({title: 'statusFieldText', details: statusFieldText});

                var approverId = prAprvFlowObj.getValue({fieldId: approverFieldText.toString()});
                var approvalStatus = prAprvFlowObj.getValue({fieldId: statusFieldText.toString()});

                if(approvalStatus == 1) {   //1 : Pending Approval
                    if(!adminLevel) {
                        adminLevel = l;
                    }
                    if(approverId == currentUserId) {
                        empFound = true;
                        nextApprovalLevel = l;
                        break;
                    }//if(approverId == currentUserId)
                }//if(approvalStatus == 1)

            }
            if(!empFound && currentUserRole == 3) {
                nextApprovalLevel = adminLevel;
            }

            if(!empFound && currentUserRole != 3) {
                nextApprovalLevel = '';
            }

        }//if(prAprvFlowObj != null)

        return nextApprovalLevel;

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }

});