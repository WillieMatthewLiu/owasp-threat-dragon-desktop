'use strict';

var fsp = require('promise-fs');

describe('datacontext service:', function () {

    var datacontext;
    var $rootScope;
    var $q;
    var mockElectron = {};
    var mockDataContextDemo = {};

    beforeEach(function () {

        mockDataContextDemo = {
            load: function() { return $q.when(null); }
        };

        mockElectron = {
            currentWindow: {
                setTitle: function() {}
            },
            dialog: {
                save: function() {}
            }
        };

        angular.mock.module('app');

        angular.mock.module(function ($provide) {
            $provide.value('electron', mockElectron);
            $provide.value('datacontextdemo', mockDataContextDemo);
        });

        angular.mock.inject(function (_$rootScope_, _$q_, _datacontext_) {
            $rootScope = _$rootScope_;
            $q = _$q_;
            datacontext = _datacontext_;
        });

        $rootScope.$apply();
    });

    it('should instantiate the service', function () {
        expect(datacontext).toBeDefined();
    });

    it('should load from the demo contect', function() {

        spyOn(mockDataContextDemo, 'load').and.callThrough();
        var params = {
            location: 'demo'
        };

        var forceQuery = true;
        datacontext.load(params, forceQuery);
        expect(mockDataContextDemo.load).toHaveBeenCalled();
        expect(mockDataContextDemo.load.calls.argsFor(0)).toEqual([forceQuery]);
    });

    it('should not load without forceQuery', function() {

        var testLocation = 'test location';
        var mockThreatModel = {};
        var params = {
            location: testLocation
        };
        datacontext.threatModel = mockThreatModel;
        datacontext.loadedLocation = testLocation;
        datacontext.threatModelLocation = testLocation;
        fsp.readFile = function() {};
        spyOn(fsp, 'readFile').and.returnValue(Promise.resolve(null));

        datacontext.load(params, false);
        expect(fsp.readFile).not.toHaveBeenCalled();
    });

    it('should always load with forceQuery', function(done) {

        var testLocation = 'test location';
        var mockThreatModel = {};
        var newThreatModel = {
            title: 'new title'
        };
        var params = {
            location: testLocation
        };
        datacontext.threatModel = mockThreatModel;
        datacontext.loadedLocation = testLocation;
        fsp.readFile = function() {
            return $q.when(JSON.stringify(newThreatModel));
        };
        spyOn(fsp, 'readFile').and.callThrough();
        spyOn(mockElectron.currentWindow, 'setTitle');

        datacontext.load(params, true).then(
            function() {
            expect(fsp.readFile).toHaveBeenCalled();
            expect(mockElectron.currentWindow.setTitle).toHaveBeenCalled();
            expect(mockElectron.currentWindow.setTitle.calls.argsFor(0)).toEqual(['OWASP Threat Dragon (' + testLocation + ')']);
            expect(datacontext.threatModel).toEqual(newThreatModel);
            expect(datacontext.threatModelLocation).toEqual(testLocation);
            done();
        }, function(reason) {
            fail(reason);
            done();
        });

        $rootScope.$apply();
    });

    it('should handle a file load error', function(done) {

        var testLocation = 'test location';
        var mockThreatModel = {};
        var errorMessage = 'error message';
        var params = {
            location: testLocation
        };
        datacontext.threatModel = mockThreatModel;
        datacontext.loadedLocation = testLocation;
        fsp.readFile = function() {
            return $q.reject(errorMessage);
        };
        spyOn(fsp, 'readFile').and.callThrough();
        spyOn(mockElectron.currentWindow, 'setTitle');

        datacontext.load(params, true).then(
            function() {
            fail('should have failed to load from file');
            done();
        }, function(reason) {
            expect(reason).toEqual(errorMessage);
            expect(fsp.readFile).toHaveBeenCalled();
            expect(mockElectron.currentWindow.setTitle).not.toHaveBeenCalled();
            expect(datacontext.threatModel).toBeNull();
            expect(datacontext.threatModelLocation).toBeNull();
            done();
        });

        $rootScope.$apply();
    });

    it('should close the threat model', function() {

        var testLocation = 'test location';
        var mockThreatModel = {};
        datacontext.threatModel = mockThreatModel;
        datacontext.threatModelLocation = testLocation;
        spyOn(mockElectron.currentWindow, 'setTitle');
        datacontext.close();   
        expect(mockElectron.currentWindow.setTitle).toHaveBeenCalled();
        expect(mockElectron.currentWindow.setTitle.calls.argsFor(0)).toEqual(['OWASP Threat Dragon']);
        expect(datacontext.threatModel).toBeNull();
        expect(datacontext.threatModelLocation).toBeNull();
    });

    it('should delete the file', function(done) {

        var testLocation = 'test location';
        var mockThreatModel = {};

        datacontext.threatModel = mockThreatModel;
        datacontext.threatModelLocation = testLocation;
        fsp.unlink = function() {
            return $q.when(null);
        };
        spyOn(fsp, 'unlink').and.callThrough();

        datacontext.deleteModel().then(
            function(result) {
            expect(fsp.unlink).toHaveBeenCalled();
            expect(fsp.unlink.calls.argsFor(0)).toEqual([testLocation]);
            expect(datacontext.threatModel).toBeNull();
            expect(datacontext.threatModelLocation).toBeNull();
            expect(result).toBeNull();
            done();
        }, function(reason) {
            fail(reason);
            done();
        });

        $rootScope.$apply();
    });

    it('should handle a file delete error', function(done) {

        var mockThreatModel = {};

        datacontext.threatModel = mockThreatModel;
        datacontext.threatModelLocation = null;
        fsp.unlink = function() {
            return $q.then(null);
        };
        spyOn(fsp, 'unlink').and.callThrough();

        datacontext.deleteModel().then(
            function() {
            fail('should have failed to delete the file');
            done();
        }, function(reason) {
            expect(reason).toEqual('No file specified');
            expect(fsp.unlink).not.toHaveBeenCalled();
            expect(datacontext.threatModel).toEqual(mockThreatModel);
            done();
        });

        $rootScope.$apply();
    });

    it('should ask for a new location when creating', function(done) {

        var mockThreatModel = {};
        datacontext.threatModel = mockThreatModel;
        datacontext.threatModelLocation = 'test location';
        spyOn(mockElectron.dialog, 'save');

        datacontext.create(mockThreatModel).then(
            function() {
            expect(mockElectron.dialog.save).toHaveBeenCalled();
            done();
        }, function(reason) {
            fail(reason);
            done();
        });

        $rootScope.$apply();

    });

    it('should ask for a new location when saving as', function(done) {

        var mockThreatModel = {};
        datacontext.threatModel = mockThreatModel;
        datacontext.threatModelLocation = null;
        spyOn(mockElectron.dialog, 'save');

        datacontext.saveAs(mockThreatModel).then(
            function() {
            expect(mockElectron.dialog.save).toHaveBeenCalled();
            done();
        }, function(reason) {
            fail(reason);
            done();
        });

        $rootScope.$apply();

    });

    it('should ask for a new location when saving the demo model', function(done) {

        var mockThreatModel = {};
        datacontext.threatModel = mockThreatModel;
        datacontext.threatModelLocation = 'demo';
        spyOn(mockElectron.dialog, 'save');

        datacontext.update(mockThreatModel).then(
            function() {
            expect(mockElectron.dialog.save).toHaveBeenCalled();
            done();
        }, function(reason) {
            fail(reason);
            done();
        });

        $rootScope.$apply();

    });

    it('should save a non-demo model', function(done) {

        var mockThreatModel = {
            title: 'test title'
        };
        var testLocation = 'test location';
        datacontext.threatModel = mockThreatModel;
        datacontext.threatModelLocation = testLocation;
        spyOn(mockElectron.dialog, 'save');
        spyOn(mockElectron.currentWindow, 'setTitle');

        fsp.writeJson = function() { return $q.when({}); };
        spyOn(fsp, 'writeJson').and.callThrough();

        datacontext.update().then(
            function() {
            expect(mockElectron.dialog.save).not.toHaveBeenCalled();
            expect(fsp.writeJson).toHaveBeenCalled();
            expect(fsp.writeJson.calls.argsFor(0)).toEqual([testLocation, mockThreatModel]);
            expect(mockElectron.currentWindow.setTitle).toHaveBeenCalled();
            expect(mockElectron.currentWindow.setTitle.calls.argsFor(0)).toEqual(['OWASP Threat Dragon (' + testLocation + ')']);
            done();
        }, function(reason) {
            fail(reason);
            done();
        });

        $rootScope.$apply();

    });

    it('should save a diagram', function(done) {
        var id = 'test id';
        var testSize = 'test size';
        var testJson = 'test json';
        var testDiagramData = {
            size: testSize,
            diagramJson: testJson
        };
        var mockThreatModel = {
            detail: {
                diagrams: [{ id: id}]
            }
        };
        var testLocation = 'test location';
        datacontext.threatModel = mockThreatModel;
        datacontext.threatModelLocation = testLocation;
        spyOn(mockElectron.dialog, 'save');

        fsp.writeJson = function() { return $q.when({}); };
        spyOn(fsp, 'writeJson').and.callThrough();

        datacontext.saveThreatModelDiagram(id, testDiagramData).then(
            function() {
                expect(fsp.writeJson).toHaveBeenCalled();
                expect(mockElectron.dialog.save).not.toHaveBeenCalled();
                var savedModel = fsp.writeJson.calls.argsFor(0)[1];
                expect(savedModel.detail.diagrams[0].size).toEqual(testSize);
                expect(savedModel.detail.diagrams[0].diagramJson).toEqual(testJson);
                done();
        }, function(reason) {
                fail(reason);
                done();
        });

        $rootScope.$apply();

    });

    it('should fail to save a diagram', function(done) {
        var id = 'test id';
        var badId = 'bad id';
        var testSize = 'test size';
        var testJson = 'test json';
        var testDiagramData = {
            size: testSize,
            diagramJson: testJson
        };
        var mockThreatModel = {
            detail: {
                diagrams: [{ id: id}]
            }
        };
        var testLocation = 'test location';
        datacontext.threatModel = mockThreatModel;
        datacontext.threatModelLocation = testLocation;
        spyOn(mockElectron.dialog, 'save');

        fsp.writeJson = function() { return $q.when({}); };
        spyOn(fsp, 'writeJson').and.callThrough();

        datacontext.saveThreatModelDiagram(badId, testDiagramData).then(
            function() {
                fail('should have failed');
                done();
            }, function(reason) {
                expect(fsp.writeJson).not.toHaveBeenCalled();
                expect(mockElectron.dialog.save).not.toHaveBeenCalled();
                expect(reason.message).toEqual('invalid diagram id');
                done();
        });

        $rootScope.$apply();

    });

    it('should handle a save error', function(done) {

        var mockThreatModel = {
            title: 'test title'
        };
        var testLocation = 'test location';
        var error = 'error message';
        datacontext.threatModel = mockThreatModel;
        datacontext.threatModelLocation = testLocation;
        spyOn(mockElectron.dialog, 'save');
        spyOn(mockElectron.currentWindow, 'setTitle');

        fsp.writeJson = function() { return $q.reject(error); };
        spyOn(fsp, 'writeJson').and.callThrough();

        datacontext.update().then(
            function() {
            fail('should have errored');
            done();
        }, function(reason) {
            expect(mockElectron.dialog.save).not.toHaveBeenCalled();
            expect(fsp.writeJson).toHaveBeenCalled();
            expect(fsp.writeJson.calls.argsFor(0)).toEqual([testLocation, mockThreatModel]);
            expect(mockElectron.currentWindow.setTitle).not.toHaveBeenCalled();
            expect(reason).toEqual(error);
            done();
        });

        $rootScope.$apply();

    });
});