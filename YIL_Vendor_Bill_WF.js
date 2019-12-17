/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * 
 */

define(["N/url", "N/email", "N/encode", "N/search", "N/file"], function(url, email, encode, search, file) {

    function onAction(context) {

        log.debug({title: 'Reached Here...', details: 'Reached Here...'});
        try {
            
            var currentRec = context.newRecord;
            
            if(currentRec) {

                _pendingBillEmailTemplate(currentRec);

            }

        }
        catch(err) {
            log.debug({title: "Error Generating Email to Custom Approver.", details: err});
        }
        
    }

    function _pendingBillEmailTemplate(currentRec) {

        //Procurement, Zume Inc 49191
        //var fileObj = render.transaction({entityId: Number(purchaseRequestId), printMode: render.PrintMode.PDF, isCustLocale: true});
        var bodyString = "";
        var poTableString = "";
        var fileIdsArr = [];
        var attachmentArr = [];
        var suiteletURL = url.resolveScript({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', returnExternalUrl: true});
        
        var billId = '', tranIdText = '', requestorName = '', customApproverId = '', billCreatorId = '', preparerName = '', vendorName  = '', totalAmount = '', departnmentName = '', className = '';
        
        if(currentRec) {
            billId = currentRec.id;
            tranIdText = currentRec.getValue({fieldId: 'transactionnumber'});
            requestorName = currentRec.getText({fieldId: 'custbody11'});
            customApproverId = currentRec.getValue({fieldId: 'custbody11'});
            preparerName = currentRec.getText({fieldId: 'custbody_creator'});
            billCreatorId = currentRec.getValue({fieldId: 'custbody_creator'});
            vendorName = currentRec.getText({fieldId: 'entity'});
            totalAmount = currentRec.getValue({fieldId: 'total'});
            //departnmentName = currentRec.getText({fieldId: 'department'});
            //className = currentRec.getText({fieldId: 'class'});
            totalAmount = Number(totalAmount).toFixed(2);
            poTableString += _getItemAndExpenseTable(currentRec);

            fileIdsArr = _getFileIdsFromBillSearch(billId);
            if(fileIdsArr.length > 0) {
                attachmentArr = _makeFileObjArr(fileIdsArr);
            }
        }

        log.debug({title: 'fileIdsArr', details: fileIdsArr});

        var emailSubject = "Bill #"+tranIdText + " has been submitted for your approval.";
        
            var emailToId = customApproverId;
            var userName = 'User';
            if(requestorName) {
                userName = requestorName
            }

            var approveURLParam = suiteletURL + '&processFlag=ba&bid='+getEncodedValue(billId);
            var rejectURLParam = suiteletURL + '&processFlag=br&bid='+getEncodedValue(billId);

            bodyString += " <html>";
            bodyString += "     <body>";
            bodyString += "         Dear "+userName+",<br/><br/>You have received a new Bill for approval.";
            bodyString += "         <br/>";
            
            bodyString += "         <table>";
            bodyString += "         <tr><td>Bill Number</td><td>:</td><td>"+tranIdText+"</td></tr>";
            bodyString += "         <tr><td>Approver</td><td>:</td><td>"+requestorName+"</td></tr>";
            bodyString += "         <tr><td>Creator</td><td>:</td><td>"+preparerName+"</td></tr>";
            bodyString += "         <tr><td>Vendor</td><td>:</td><td>"+vendorName+"</td></tr>";
            bodyString += "         <tr><td>Total Amount</td><td>:</td><td>"+totalAmount+"</td></tr>";
            //bodyString += "         <tr><td>Department</td><td>:</td><td>"+departnmentName+"</td></tr>";
            //bodyString += "         <tr><td>Class</td><td>:</td><td>"+className+"</td></tr>";
            bodyString += "         </table>";
            bodyString += "         <br/><br/>";
            bodyString += poTableString;
            bodyString += "         <br/><br/>";
            //bodyString += "         Attached PDF is snapshot of PR.<br/>";
            bodyString += "         Please use below buttons to either <i><b>Approve</b></i> or <i><b>Reject</b></i> Bill.";
            bodyString += "         <br/><br/>";
            bodyString += "         <b>Note:</b> Upon rejection system will ask for 'Reason for Rejection'.";

            bodyString += "         <br/><br/>";

            bodyString += "         <a href='"+approveURLParam+"'><img src='http://shopping.na0.netsuite.com/core/media/media.nl?id=16030&c=4879077_SB1&h=96a3cf9a7b52344b900a' border='0' alt='Accept' style='width: 60px;'/></a>";
            bodyString += "         <a href='"+rejectURLParam+"'><img src='http://shopping.na0.netsuite.com/core/media/media.nl?id=16029&c=4879077_SB1&h=e05cf731ab1ecfb3cdbc' border='0' alt='Reject' style='width: 60px;'/></a>";
            bodyString += "         <br/><br/>Thank you<br/>Admin";
            bodyString += "     </body>";
            bodyString += " </html>";
            
            var emailObj = email.send({
                author: 49191,
                recipients: emailToId,
                subject: emailSubject,
                body: bodyString,
                attachments: attachmentArr,
                relatedRecords: {transactionId: Number(billId)}
            });
        

    }

    function _getItemAndExpenseTable(prObj) {
        var poTableString = "";

        var itemTotalAmount = 0.00;
            var expenseTotalAmount = 0.00;
            var poItemLnCount = prObj.getLineCount({sublistId: 'item'});
                if(Number(poItemLnCount) > 0) {
                    poTableString += "<p><h2>Items:</h2></p>";
                    poTableString += "<table border= '1' cellspacing='0' cellpadding='5'>";
                        poTableString += "<tr>";
                            poTableString += "  <th><center><b>Sr.No.</b></center></th>";
                            poTableString += "  <th><center><b>Item</b></center></th>";
                            poTableString += "  <th><center><b>Department</b></center></th>";
                            poTableString += "  <th><center><b>Class</b></center></th>";
                            poTableString += "  <th><center><b>Quantity</b></center></th>";
                            poTableString += "  <th><center><b>Rate</b></center></th>";
                            poTableString += "  <th><center><b>Amount</b></center></th>";
                        poTableString += "</tr>";

                        for(var it=0;it<poItemLnCount;it++) {
                            
                            var srNo = Number(it) + 1;
                            var itemName        = prObj.getSublistText({sublistId: 'item', fieldId: 'item', line: it});
                            var lnDepartmentNam = prObj.getSublistText({sublistId: 'item', fieldId: 'department', line: it});
                            var lnClassNm       = prObj.getSublistText({sublistId: 'item', fieldId: 'class', line: it});
                            var itemQty         = prObj.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: it});
                            var itemRate        = prObj.getSublistValue({sublistId: 'item', fieldId: 'rate', line: it});
                            var itemAmt         = prObj.getSublistValue({sublistId: 'item', fieldId: 'amount', line: it});
                            itemRate = Number(itemRate).toFixed(2);
                            itemAmt = Number(itemAmt).toFixed(2);
                            itemTotalAmount = Number(itemTotalAmount) + Number(itemAmt);

                            poTableString += "<tr>";
                                poTableString += "  <td align=\"center\">"+srNo+"</td>";
                                poTableString += "  <td align=\"left\">"+itemName+"</td>";
                                poTableString += "  <td align=\"lett\">"+lnDepartmentNam+"</td>";
                                poTableString += "  <td align=\"left\">"+lnClassNm+"</td>";
                                poTableString += "  <td align=\"center\">"+itemQty+"</td>";
                                poTableString += "  <td align=\"right\">"+itemRate+"</td>";
                                poTableString += "  <td align=\"right\">"+itemAmt+"</td>";
                            poTableString += "</tr>";

                        }//for(var it=0;it<poItemLnCount;it++)

                        itemTotalAmount = Number(itemTotalAmount).toFixed(2);

                        poTableString += "<tr>";
                            poTableString += "  <td align=\"right\" colspan=\"6\"><b>Total</b></td>";
                            poTableString += "  <td align=\"right\"><b>"+itemTotalAmount+"</b></td>";
                        poTableString += "</tr>";
                    poTableString += "</table>";
                }//if(Number(poItemLnCount) > 0)
                poTableString += "<br/>";
                var poExpenseLnCount = prObj.getLineCount({sublistId: 'expense'}); 
                if(Number(poExpenseLnCount) > 0) {
                    poTableString += "<p><h2>Expenses:</h2></p>";
                    poTableString += "<table border= '1' cellspacing='0' cellpadding='5'>";
                        poTableString += "<tr>";
                            poTableString += "  <th><center><b>Sr.No.</b></center></th>";
                            poTableString += "  <th><center><b>Category</b></center></th>";
                            poTableString += "  <th><center><b>Account</b></center></th>";
                            poTableString += "  <th><center><b>Department</b></center></th>";
                            poTableString += "  <th><center><b>Class</b></center></th>";
                            poTableString += "  <th><center><b>Amount</b></center></th>";
                        poTableString += "</tr>";

                        for(var xp=0;xp<poExpenseLnCount;xp++) {
                            
                            var xpSrNo = Number(xp) + 1;
                            var categoryName        = prObj.getSublistText({sublistId: 'expense', fieldId: 'category', line: xp});
                            var acocuntName = prObj.getSublistText({sublistId: 'expense', fieldId: 'account', line: xp});
                            var expDepartmentNam = prObj.getSublistText({sublistId: 'expense', fieldId: 'department', line: xp});
                            var expClassNam       = prObj.getSublistText({sublistId: 'expense', fieldId: 'class', line: xp});
                            var expAmount         = prObj.getSublistValue({sublistId: 'expense', fieldId: 'amount', line: xp});
                            expAmount = Number(expAmount).toFixed(2);
                            expenseTotalAmount = Number(expenseTotalAmount) + Number(expAmount);
                            log.debug({title: "expenseTotalAmount", details: expenseTotalAmount});
                            poTableString += "<tr>";
                                poTableString += "  <td align=\"center\">"+xpSrNo+"</td>";
                                poTableString += "  <td align=\"left\">"+categoryName+"</td>";
                                poTableString += "  <td align=\"lett\">"+acocuntName+"</td>";
                                poTableString += "  <td align=\"left\">"+expDepartmentNam+"</td>";
                                poTableString += "  <td align=\"center\">"+expClassNam+"</td>";
                                poTableString += "  <td align=\"right\">"+expAmount+"</td>";
                            poTableString += "</tr>";

                        }//for(var it=0;it<poItemLnCount;it++)

                        expenseTotalAmount = Number(expenseTotalAmount).toFixed(2);

                        poTableString += "<tr>";
                            poTableString += "  <td align=\"right\" colspan=\"5\"><b>Total</b></td>";
                            poTableString += "  <td align=\"right\"><b>"+expenseTotalAmount+"</b></td>";
                        poTableString += "</tr>";
                    poTableString += "</table>";
                }//if(Number(poItemLnCount) > 0)

        return poTableString;
    }
    
    function getEncodedValue(tempString) {
        var encodedValue = encode.convert({
            string: tempString.toString(),
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64_URL_SAFE        
        });

        return encodedValue.toString();
    }

    function _getFileIdsFromBillSearch(billId) {

        var fileIdsArr = [];
        var billSearchRes = search.create({type: 'vendorbill', 
            filters: [
                search.createFilter({name: 'internalid', operator: search.Operator.ANYOF, values: billId}),
                search.createFilter({name: 'mainline', operator: search.Operator.IS, values: true})
            ], 
            columns: [
                search.createColumn({name: 'internalid', join: 'file'})
            ]
        });

        if(billSearchRes.runPaged().count > 0) {
            billSearchRes.run().each(function(result) {
                var fileId = result.getValue({name: 'internalid', join: 'file'});
                if(fileId) {
                    fileIdsArr.push(fileId);
                }
                return true;
            })
        }

        return fileIdsArr;

    }

    function _makeFileObjArr(fileIdsArr) {

        var returnableArr = [];

        if(fileIdsArr.length > 0) {
            for(var i=0;i<fileIdsArr.length;i++) {
                returnableArr.push(file.load({id: fileIdsArr[i]}));
            }
        }

        return returnableArr;
    }


    return {
        onAction: onAction
    }

});