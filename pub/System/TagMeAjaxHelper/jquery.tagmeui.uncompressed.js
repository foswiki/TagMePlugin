/*
 * Interactive user interface for Foswiki TagMePlugin, implemented wth JQuery.
 * 
 * This file is Copyright (C) 2010 Paul.W.Harvey@csiro.au - www.taxonomy.org.au
 * Centre for Plant Biodiversity Research CSIRO Plant Industry- www.csiro.au/pi
 * 
 * This program is free software; you can redistribute it and/or modify it 
 * under the terms of the GNU General Public License as published by the Free 
 * Software Foundation; either version 2 of the License, or (at your option) 
 * any later version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or 
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for 
 * more details, published at http://www.gnu.org/copyleft/gpl.html 
 *
 * @author: Paul Harvey <Paul.W.Harvey@csiro.au>
 * @date:   2010-02-11
 * @see:    http://foswiki.org/Extensions/TagMePlugin#jqui
 */


'use strict';
jQuery(document).ready(function () {
    (function ($) {
        $.fn.tagmeui = function (options) {
            /* TODO: 
             * - Prevent multiple instantiations on DOM elements.
             * - There isn't much need for this.each/chaining. Re-factor to use
             *   jquery metadata plugin, and so opts can be extracted from DOM 
             *   element. Eg: $('#myTagMeDivWithMetaData').tagmeui({extra: 'opts'});
	     *   - 2011-06-08: removed the each stuff anyway, jquery-1.3'ism
             * - There is no meaningful feedback to user if ajax calls fail 
             *   (auth/permissions, etc) */
	    var tagmeui = new TagMeUI($(this), options);
	    
	    tagmeui.initTagField();
            
            return this;
        };
        
        function TagMeUI(caller, options) {
            var that = this,
                pageTopic = foswiki.getPreference('TOPIC'),
                pageWeb = foswiki.getPreference('WEB'),
                pageSystemWeb = foswiki.getPreference('SYSTEMWEB'),
                pageScriptUrlPath = foswiki.getPreference('SCRIPTURLPATH');
            
            this.caller = caller;
            this.urlQuery = $.query;
            this.cloudQuery = this.urlQuery.copy();
            this.cloudQuery.SET('skin', 'text');
            this.cloudQuery.SET('contenttype', 'text/plain');
            this.cloudQuery.SET('section', 'cloud');
            /* Convert comma separated list of tags (from html meta) to array */
            this.tags = foswiki.getPreference('TagMePlugin.jquitags').split(',');
            if (!this.cloudQuery.get('qcallingweb')) {
                this.cloudQuery.SET('qcallingweb', pageWeb);
            }
            this.settings = {
                cloudSpinner: '#tagmejqtagbutton',
                cloudContainer: '#tagmejqcloud',
                cloudWeb: (function () {
                    var web = that.cloudQuery.get('qcallingweb');
                    
                    if (!web) {
                        web = pageWeb;
                    }
                    
                    if (!that.cloudQuery.get('tpweb')) {
                        that.cloudQuery.SET('tpweb', web);
                    }
                    
                    return web;
                }()),
                cloudGetUrl: pageScriptUrlPath + '/view/' + 
                    pageSystemWeb + '/TagMeAjaxHelper',
                cloudUiJustThisWeb: '#tagmejqCheckboxJustThisWeb',
                cloudUiJustMe: '#tagmejqCheckboxJustMe',
                cloudModalOpts: {
                    opacity: 7,
                    position: ['70px', null],
                    maxWidth: (document.width - 50),
                    persist: true,
                    onShow: function () {
                        $('#simplemodal-overlay').click(

                        function () {
                            $.modal.close();
                        });
                    }
                },
                taglistSpinner: '#tagmejqtagstatus',
                taglistContainer: '#tagmejqcontainer',
                taglistInputField: '#tagmejqinputfield',
                tagLinkUrl: pageScriptUrlPath + '/view/' + 
                    pageSystemWeb + '/TagMeSearch',
                tagLinkTitle: 'Other topics with this tag',
                tagPostUrl: pageScriptUrlPath + '/viewauth/' + pageWeb + 
                    '/' + pageTopic,
                autocompleteUrl: pageScriptUrlPath + '/view/' + 
                    pageSystemWeb + '/TagMeAjaxHelper?section=tagquery&contenttype=text/plain&skin=text',
                autocompleteOpts: {
                    extraParams: {
                        section: 'tagquery',
                        contenttype: 'text/plain',
                        skin: 'text'
                    },
                    autoFill: true,
                    matchCase: false,
                    multiple: false,
                    max: 0,
                    mustMatch: false
                }
            };
            $.extend(this.settings, options);    
        }
        
        /* Check that tagName exists inList, and if not, POST the action and execute
        ** the finishHandler(tagName) */
        TagMeUI.prototype.actOnMissingTag = function (tagName, inList, action, finishHandler) {
            var didModify = false,
                that = this;

            if ($.inArray(tagName, inList) === -1) {
                $(this.settings.taglistSpinner).addClass('spinning');
                $.post(this.settings.postUrl, {
                    tpaction: action,
                    tptag: tagName,
                    qWeb: foswiki.getPreference('WEB'),
                    qTopic: foswiki.getPreference('TOPIC'),
                    contenttype: 'text/plain',
                    skin: 'tagmejquiajax'
                },

                function (data) {
                    that.linkifyTagText(that.settings.taglistContainer);
                    $(that.settings.taglistSpinner).removeClass('spinning');
                    finishHandler(tagName);
                });
                didModify = true;
            }

            return didModify;
        };

        /* By default, textboxlist doesn't handle hyperlinks in the list items.
        ** This would be much better implemented using some sort of callback, but
        ** textboxlist didn't seem to implement a suitable hook. */
        TagMeUI.prototype.linkifyTagText = function (selector) {
            var that = this;
            $(selector + ' > form > div.jqTextboxListContainer > span:not(.linkified)').each(
                function (index, tagSpan) {
                    var tagQuery = $.query.copy(),
                        theTag = $(tagSpan).text(),
                        pageWeb = foswiki.getPreference('WEB');
                    
                    /* There must be an easier way to remove the textNode from a span; but
                    ** I don't know it... yet. .text('') destroys child elements we want to
                    ** keep. */
                    function removeTextNodes(element) {
                        if ( (typeof(element.lastChild) === 'object') && 
                            (element.lastChild !== null) ) {
                            element.lastChild.data = '';
                        }

                        return;
                    }

                    tagQuery.SET('tag', theTag);
                    tagQuery.SET('qcallingweb', pageWeb);
                    tagQuery.SET('qweb', pageWeb);
                    removeTextNodes(tagSpan);
                    $(tagSpan).append('<a href="' + that.settings.tagLinkUrl + 
                        tagQuery.toString() + '" title="' + 
                        that.settings.tagLinkTitle + '">' + theTag + '</a>');
                    $(tagSpan).addClass('linkified');
                }
            );

            return;
        };
        
        /* Populates a hidden div with the tag cloud and then displays it 
         * with simplemodal. Some messiness to bind events on the cloud modal */
        TagMeUI.prototype.loadCloud = function () {
            var that = this;
        
            function initDialogue() {
                function setQueryWithCheckbox(qkey, qvalue, checkbox, sense) {
                    if ($(checkbox).is(':checked') === sense) {
                        that.cloudQuery.SET(qkey, qvalue);
                    } else {
                        that.cloudQuery = that.cloudQuery.remove(qkey);
                    }
                }
                
                /* Would be nice if simplemodal had more sensible autosizing 
                 * with content. */
                if ($('#simplemodal-container').width() > $(document).width() - 50) {
                    $('#simplemodal-container').width($(document).width() - 50);
                }
                $(that.settings.cloudUiJustThisWeb).click(function () {
                    setQueryWithCheckbox('tpweb', that.settings.cloudWeb, 
                        that.settings.cloudUiJustThisWeb, false);
                    that.loadCloud();
                });
                $(that.settings.cloudUiJustMe).click(function () {
                    setQueryWithCheckbox('tpuser', 'me', 
                        that.settings.cloudUiJustMe, true);
                    that.loadCloud();
                });
            }

            $(this.settings.cloudSpinner).addClass('spinning');
            $(this.settings.cloudContainer).load(this.settings.cloudGetUrl + 
                this.cloudQuery.toString(), function () {
                $(that.settings.cloudSpinner).removeClass('spinning');
                $(that.settings.cloudContainer).modal(that.settings.cloudModalOpts);
                initDialogue();
            });
        };

        TagMeUI.prototype.initTagField = function () {
            /* MD's textboxlist jq plugin allows the user to easily work on tags */
            var that = this;
            
            $(this.settings.taglistInputField).textboxlist({
                onSelect: function (input) {
                    /* The logic here is a bit odd, started out anticipating a batch rather than
                    ** one-by-one POST to updated a modified selection of tags... */
                    var selectedTags = input.currentValues, 
                        didAdd = false;

                    /* If there's a selected tag that isn't in the list of stored tags,
                    ** it needs to be added. */
                    $.each(selectedTags, function (index, tagName) {
                        if (that.actOnMissingTag(tagName, that.tags, 'newtagsandadd', 
                            function (tagName) {
                                that.tags.push(tagName);
                            })
                        ) {
                            didAdd = true;
                        }
                    });

                    if (!didAdd) {
                        /* If there's a stored tag that isn't in the list of selected tags, 
                        ** it needs to be removed. */
                        $.each(that.tags, function (index, tagName) {
                            var removeAction = foswiki.getPreference('TagMePlugin.remove');

                            if ( (typeof(removeAction) !== 'undefined') && (removeAction === 'all') ) {
                                removeAction = 'removeall';
                            } else {
                                removeAction = 'remove';
                            }
                            if (!that.actOnMissingTag(tagName, selectedTags, removeAction, 
                                function (tagName) {
                                    that.tags.pop(tagName);
                                })
                            ) {
                                that.linkifyTagText(that.settings.taglistContainer);
                            }
                        });
                    }
                    
                },
                onDeselect: function (input) {
                    /* The logic here is a bit odd, started out anticipating a batch rather than
                    ** one-by-one POST to updated a modified selection of tags... */
                    var selectedTags = input.currentValues, 
                        didAdd = false;

                    /* If there's a selected tag that isn't in the list of stored tags,
                    ** it needs to be added. */
                    $.each(selectedTags, function (index, tagName) {
                        if (that.actOnMissingTag(tagName, that.tags, 'newtagsandadd', 
                            function (tagName) {
                                that.tags.push(tagName);
                            })
                        ) {
                            didAdd = true;
                        }
                    });

                    if (!didAdd) {
                        /* If there's a stored tag that isn't in the list of selected tags, 
                        ** it needs to be removed. */
                        $.each(that.tags, function (index, tagName) {
                            var removeAction = foswiki.getPreference('TagMePlugin.remove');

                            if ( (typeof(removeAction) !== 'undefined') && (removeAction === 'all') ) {
                                removeAction = 'removeall';
                            } else {
                                removeAction = 'remove';
                            }
                            if (!that.actOnMissingTag(tagName, selectedTags, removeAction, 
                                function (tagName) {
                                    that.tags.pop(tagName);
                                })
                            ) {
                                that.linkifyTagText(that.settings.taglistContainer);
                            }
                        });
                    }
                },

                autocomplete: this.settings.autocompleteUrl,
                autocompleteOpts: this.settings.autocompleteOpts
            });
            this.linkifyTagText(this.settings.taglistContainer);

            $(this.settings.cloudSpinner).click(function () {
                that.loadCloud();
            });
        };
        
    }(jQuery));
    
    /* Install tagmeui using default options */
    $.fn.tagmeui();
});
